import { spawn } from 'child_process';

const CLAUDE_PATH = '/Users/sooyoungbae/.npm-global/bin/claude';

function getCleanEnv() {
  return {
    HOME: process.env.HOME || '',
    PATH: process.env.PATH || '',
    USER: process.env.USER || '',
    SHELL: process.env.SHELL || '/bin/zsh',
    TMPDIR: process.env.TMPDIR || '/tmp',
    LANG: process.env.LANG || 'en_US.UTF-8',
  } as unknown as NodeJS.ProcessEnv;
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_PATH, ['--print', prompt], {
      env: getCleanEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

export async function streamChatResponse(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
) {
  // 대화 히스토리를 하나의 프롬프트로 구성
  let prompt = systemPrompt + '\n\n';
  for (const msg of messages) {
    prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
  }

  const env = getCleanEnv();
  const proc = spawn(CLAUDE_PATH, ['--print', prompt], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return proc;
}

export async function generateCompletion(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const prompt = `${systemPrompt}\n\n---\nUser: ${userMessage}`;
  return runClaude(prompt);
}

export async function generateCompletionWithImage(
  systemPrompt: string,
  userMessage: string,
  _imageBase64: string,
  _mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png'
): Promise<string> {
  // Claude CLI는 이미지 입력을 지원하지 않으므로 텍스트만 전달
  const prompt = `${systemPrompt}\n\n---\nUser: ${userMessage}\n\n(Note: A reference image was provided but cannot be processed in CLI mode. Generate based on the text description.)`;
  return runClaude(prompt);
}
