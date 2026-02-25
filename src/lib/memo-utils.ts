import type { Block } from '@blocknote/core';

/**
 * Check if stored content is BlockNote JSON format (vs legacy plain text)
 */
export function isBlockNoteContent(content: string): boolean {
  return content.trimStart().startsWith('[');
}

/**
 * Convert legacy plain text to BlockNote paragraph blocks
 */
export function textToBlocks(text: string): Block[] {
  if (!text.trim()) {
    return [
      {
        id: crypto.randomUUID().slice(0, 8),
        type: 'paragraph',
        props: {},
        content: [],
        children: [],
      } as unknown as Block,
    ];
  }

  return text.split('\n').map((line) => ({
    id: crypto.randomUUID().slice(0, 8),
    type: 'paragraph' as const,
    props: {},
    content: line
      ? [{ type: 'text' as const, text: line, styles: {} }]
      : [],
    children: [],
  })) as unknown as Block[];
}

/**
 * Parse stored content string into BlockNote blocks (auto-detect format)
 */
export function parseContent(content: string): Block[] {
  if (!content) return textToBlocks('');
  if (isBlockNoteContent(content)) {
    try {
      return JSON.parse(content) as Block[];
    } catch {
      return textToBlocks(content);
    }
  }
  return textToBlocks(content);
}

/**
 * Serialize BlockNote blocks to JSON string for DB storage
 */
export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

/**
 * Extract plain text from BlockNote blocks (for search preview, AI context)
 */
export function blocksToPlainText(blocks: Block[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const content = b.content;

    if (Array.isArray(content)) {
      const text = content
        .map((item: Record<string, unknown>) => {
          if (item.type === 'text') return item.text as string;
          if (item.type === 'link') {
            const linkContent = item.content as Record<string, unknown>[] | undefined;
            return linkContent?.map((c) => c.text).join('') ?? '';
          }
          return '';
        })
        .join('');
      lines.push(text);
    }

    // Recurse into children
    const children = b.children;
    if (Array.isArray(children) && children.length > 0) {
      lines.push(blocksToPlainText(children as Block[]));
    }
  }

  return lines.join('\n');
}

/**
 * Extract #tags from BlockNote blocks
 */
export function parseTagsFromBlocks(blocks: Block[]): string[] {
  const text = blocksToPlainText(blocks);
  const matches = text.match(/#([^\s#]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

/**
 * Get preview text for memo list (handles both formats)
 */
export function getPreviewText(content: string, maxLen = 60): string {
  if (!content) return '내용 없음';
  if (isBlockNoteContent(content)) {
    try {
      const blocks = JSON.parse(content) as Block[];
      const text = blocksToPlainText(blocks).trim();
      return text ? text.slice(0, maxLen) : '내용 없음';
    } catch {
      return content.slice(0, maxLen);
    }
  }
  return content.slice(0, maxLen) || '내용 없음';
}
