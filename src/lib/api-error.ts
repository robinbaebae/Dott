'use client';

/**
 * Parse API error response and return user-friendly Korean message.
 * Detects Claude CLI not found errors across all API routes.
 */
export async function getErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const errorText = data.error || data.message || '';

    // Claude CLI not installed
    if (
      errorText === 'CLAUDE_CLI_NOT_FOUND' ||
      errorText.includes('CLAUDE_CLI_NOT_FOUND')
    ) {
      return (
        '⚠️ AI 기능을 사용하려면 Claude Code CLI 설치가 필요합니다.\n\n' +
        '📋 설치 방법:\n' +
        '1. 터미널(Terminal) 앱을 열어주세요\n' +
        '2. 아래 명령어를 복사해서 붙여넣기 해주세요:\n' +
        '   npm install -g @anthropic-ai/claude-code\n' +
        '3. 설치 후 claude 를 입력해서 로그인해주세요\n' +
        '4. Dott 앱을 재시작하면 사용할 수 있습니다!'
      );
    }

    // Generic server error
    return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  } catch {
    return '연결에 문제가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
  }
}

/**
 * Check if an error message indicates CLI not found (for use in catch blocks)
 */
export function isCliNotFoundError(errorText: string): boolean {
  return errorText.includes('CLAUDE_CLI_NOT_FOUND');
}
