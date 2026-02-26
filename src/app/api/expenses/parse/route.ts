import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { spawn } from 'child_process';
import * as XLSX from 'xlsx';

const CLI_PATH = process.env.CLAUDE_CLI_PATH || 'claude';

const SYSTEM_PROMPT = `당신은 법인카드 명세서/가계부 파서입니다. 주어진 텍스트 데이터에서 지출 내역을 추출하여 JSON 배열로 반환하세요.

각 항목은 다음 필드를 포함해야 합니다:
- date: "YYYY-MM-DD" 형식 (연도가 없으면 올해 기준)
- description: 사용처/내역 (간결하게)
- amount: 숫자 (원 단위, 양수)
- category: 다음 중 하나만 사용 → "광고비", "제작비", "인플루언서", "이벤트/행사", "구독 서비스", "교통/출장", "점심식대", "접대비", "사무용품", "기타"
- payment_method: "법인카드" (기본), 다른 정보가 있으면 해당 수단
- memo: 추가 참고사항 (없으면 빈 문자열)

카테고리 판단 기준:
- 택시/주유/KTX/항공 → "교통/출장"
- 음식점/카페/배달 중 2만원 미만 → "점심식대"
- 음식점/카페/배달 중 2만원 이상 → "접대비"
- 네이버/구글/메타/카카오 광고 → "광고비"
- 디자인/영상/촬영 → "제작비"
- SaaS/클라우드/구독 → "구독 서비스"
- 문구/사무기기 → "사무용품"
- 판단 어려우면 → "기타"

중요:
- 반드시 순수 JSON 배열만 반환 (마크다운 코드블록 없이)
- 취소/환불 건은 amount를 음수로
- 합계/소계 행은 제외
- 데이터가 없거나 파싱 불가능하면 빈 배열 [] 반환`;

function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Minimal env to avoid nested session errors
    const env: Record<string, string> = {
      HOME: process.env.HOME || '',
      PATH: process.env.PATH || '',
      NODE_ENV: process.env.NODE_ENV || 'development',
      TERM: process.env.TERM || 'xterm-256color',
    };

    const child = spawn(CLI_PATH, ['--print'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env as NodeJS.ProcessEnv,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`claude exit ${code}: ${stderr.slice(0, 500)}`));
    });

    // Write prompt to stdin and close immediately
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function excelToText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    if (rows.length > 0) {
      lines.push(`[시트: ${sheetName}]`);
      for (const row of rows) {
        const cells = (row as unknown[]).map((c) => (c != null ? String(c) : '')).join('\t');
        if (cells.trim()) lines.push(cells);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function pdfToText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text;
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let rawText: string;

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      rawText = excelToText(buffer);
    } else if (fileName.endsWith('.pdf')) {
      rawText = await pdfToText(buffer);
    } else if (fileName.endsWith('.csv')) {
      rawText = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (xls, xlsx, pdf, csv)' },
        { status: 400 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: '파일에서 텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Truncate to avoid token limits
    const truncated = rawText.length > 8000 ? rawText.slice(0, 8000) + '\n...(truncated)' : rawText;

    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n다음은 법인카드 명세서/가계부 파일 내용입니다. 지출 내역을 추출해주세요:\n\n${truncated}`;

    const result = await callClaude(fullPrompt);

    // Parse AI response as JSON
    let parsed: unknown[];
    try {
      const cleaned = result.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: '파일 내용을 분석했지만 구조화하지 못했습니다. 다른 형식의 파일을 시도해주세요.' },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ entries: [] });
    }

    return NextResponse.json({ entries: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[expenses/parse] error:', message);
    return NextResponse.json({ error: `파일 처리 중 오류: ${message}` }, { status: 500 });
  }
}
