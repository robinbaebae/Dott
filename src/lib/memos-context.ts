import { supabaseAdmin } from '@/lib/supabase';
import { isBlockNoteContent, blocksToPlainText } from '@/lib/memo-utils';
import { sanitizeFilterValue } from '@/lib/postgrest-sanitize';
import type { Block } from '@blocknote/core';

/**
 * Extract readable text from memo content (handles both BlockNote JSON and legacy text)
 */
function extractText(content: string): string {
  if (!content) return '';
  if (isBlockNoteContent(content)) {
    try {
      const blocks = JSON.parse(content) as Block[];
      return blocksToPlainText(blocks);
    } catch {
      return content;
    }
  }
  return content;
}

/**
 * Fetch user's memos and format as context for AI chat.
 *
 * Strategy:
 * - Always include pinned memos (important reference material)
 * - Include recent memos (last 10)
 * - If searchQuery provided, also search for relevant memos
 * - Truncate content to keep token usage reasonable
 */
export async function getMemosContextForChat(
  userEmail: string,
  searchQuery?: string
): Promise<string> {
  try {
    // Fetch pinned + recent memos in parallel
    const [pinnedResult, recentResult] = await Promise.all([
      supabaseAdmin
        .from('memos')
        .select('title, content, tags, pinned, updated_at')
        .eq('user_id', userEmail)
        .eq('pinned', true)
        .order('updated_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('memos')
        .select('title, content, tags, pinned, updated_at')
        .eq('user_id', userEmail)
        .eq('pinned', false)
        .order('updated_at', { ascending: false })
        .limit(10),
    ]);

    const pinnedMemos = pinnedResult.data || [];
    const recentMemos = recentResult.data || [];

    // If search query, also fetch relevant memos
    let searchMemos: typeof pinnedMemos = [];
    if (searchQuery) {
      const { data } = await supabaseAdmin
        .from('memos')
        .select('title, content, tags, pinned, updated_at')
        .eq('user_id', userEmail)
        .or(`title.ilike.%${sanitizeFilterValue(searchQuery)}%,content.ilike.%${sanitizeFilterValue(searchQuery)}%`)
        .order('updated_at', { ascending: false })
        .limit(5);
      searchMemos = data || [];
    }

    // Deduplicate by content (pinned > search > recent)
    const seen = new Set<string>();
    const allMemos: typeof pinnedMemos = [];

    for (const memo of [...pinnedMemos, ...searchMemos, ...recentMemos]) {
      const text = extractText(memo.content);
      const key = `${memo.title}::${text.slice(0, 50)}`;
      if (!seen.has(key)) {
        seen.add(key);
        allMemos.push(memo);
      }
    }

    if (allMemos.length === 0) return '';

    const lines: string[] = ['--- 저장된 메모 ---'];

    for (const memo of allMemos) {
      const pin = memo.pinned ? ' [고정]' : '';
      const tags = memo.tags?.length ? ` #${memo.tags.join(' #')}` : '';
      // Extract readable text and truncate to ~300 chars
      const text = extractText(memo.content);
      const content = text.length > 300
        ? text.slice(0, 300) + '...'
        : text;
      lines.push(`## ${memo.title || '(제목 없음)'}${pin}${tags}`);
      lines.push(content);
      lines.push('');
    }

    lines.push(
      '위 메모들은 사용자가 저장한 아이디어, 기록, 참고 자료입니다.',
      '사용자가 메모를 참고해달라고 하면 관련 메모 내용을 적극 활용하세요.',
      '---'
    );

    return lines.join('\n');
  } catch {
    return '';
  }
}
