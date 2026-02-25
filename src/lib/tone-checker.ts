import { generateCompletion } from '@/lib/claude';
import { getBrandGuideContext } from '@/lib/brand-guide';

const TONE_CHECK_PROMPT = `당신은 브랜드 톤앤매너 전문 검수자입니다.
주어진 콘텐츠가 브랜드 가이드의 톤앤매너와 얼마나 일치하는지 평가하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "score": 1-10 사이의 정수,
  "summary": "한 줄 요약",
  "strengths": ["잘된 점 1", "잘된 점 2"],
  "improvements": ["개선점 1", "개선점 2"]
}`;

export async function checkTone(content: string, userEmail: string): Promise<{
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
} | null> {
  const brandContext = await getBrandGuideContext(userEmail);
  if (!brandContext) return null;

  const userMessage = `${brandContext}\n\n---\n\n검수할 콘텐츠:\n${content}`;
  const raw = await generateCompletion(TONE_CHECK_PROMPT, userMessage);

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}
