import Anthropic from '@anthropic-ai/sdk';
import { exec, execSync } from 'child_process';
import { supabaseAdmin } from './supabase';

/**
 * Get the user's Anthropic API key from DB.
 * Returns null if not set — CLI fallback will be used.
 */
export async function getUserApiKey(userEmail: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('user_settings')
      .select('anthropic_api_key')
      .eq('user_id', userEmail)
      .single();

    if (data?.anthropic_api_key) return data.anthropic_api_key;
  } catch {
    // table might not exist yet
  }

  return process.env.ANTHROPIC_API_KEY || null;
}

// ─── Claude CLI fallback (for Claude Pro subscribers without API key) ───

// Custom error class for CLI-not-found scenarios
export class ClaudeCliNotFoundError extends Error {
  constructor() {
    super('CLAUDE_CLI_NOT_FOUND');
    this.name = 'ClaudeCliNotFoundError';
  }
}

let _cachedCliPath: string | null = null;
let _cliExists: boolean | null = null;

function findClaudeCli(): string {
  if (_cachedCliPath && _cliExists) return _cachedCliPath;

  const fs = require('fs');
  const home = process.env.HOME || require('os').homedir();

  const candidates = [
    `${home}/.npm-global/bin/claude`,
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${home}/.local/bin/claude`,
    `${home}/.nvm/versions/node/${process.version}/bin/claude`,
  ];

  for (const p of candidates) {
    try { if (fs.existsSync(p)) { _cachedCliPath = p; _cliExists = true; return p; } } catch { /* skip */ }
  }

  // Last resort: use `which` to find it via shell PATH
  try {
    const resolved = execSync('which claude', { encoding: 'utf8', timeout: 3000 }).trim();
    if (resolved) { _cachedCliPath = resolved; _cliExists = true; return resolved; }
  } catch { /* not found */ }

  _cliExists = false;
  throw new ClaudeCliNotFoundError();
}

/**
 * Shell-escape a string for safe use in shell commands
 */
function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function runCli(args: string[], timeoutMs = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    let cliPath: string;
    try {
      cliPath = findClaudeCli();
    } catch (e) {
      if (e instanceof ClaudeCliNotFoundError) {
        reject(e);
        return;
      }
      throw e;
    }
    console.log('[claude-cli] path:', cliPath);

    // Build shell command with proper escaping
    const cmd = [cliPath, ...args.map(shellEscape)].join(' ');

    // Filter env vars that cause nested session errors
    const home = process.env.HOME || require('os').homedir();
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;
    delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;
    // Ensure common bin paths are in PATH
    const extraPaths = [`${home}/.npm-global/bin`, '/usr/local/bin', '/opt/homebrew/bin'];
    cleanEnv.PATH = [...extraPaths, cleanEnv.PATH || ''].join(':');

    // Use exec (shell) instead of execFile — resolves ENOENT issues
    const child = exec(cmd, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs,
      env: cleanEnv,
      shell: '/bin/zsh',
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('[claude-cli] error:', error.message, '| stderr:', stderr?.slice(0, 200));
        // Detect "command not found" style errors
        const errText = (stderr || error.message || '').toLowerCase();
        if (errText.includes('not found') || errText.includes('enoent')) {
          reject(new ClaudeCliNotFoundError());
        } else {
          reject(new Error(`Claude CLI error: ${stderr || error.message}`));
        }
      } else {
        resolve(stdout.trim());
      }
    });

    // Close stdin to prevent hanging
    child.stdin?.end();
  });
}

async function cliCompletion(systemPrompt: string, userMessage: string): Promise<string> {
  const args = ['--print'];
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }
  args.push(userMessage);
  return runCli(args);
}

// ─── API client (for users with API key) ───

const clientCache = new Map<string, Anthropic>();

function getClient(apiKey: string): Anthropic {
  let client = clientCache.get(apiKey);
  if (!client) {
    client = new Anthropic({ apiKey });
    clientCache.set(apiKey, client);
  }
  return client;
}

// ─── Public functions ───

export async function generateCompletion(
  apiKey: string | null,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  // CLI fallback when no API key
  if (!apiKey) {
    return cliCompletion(systemPrompt, userMessage);
  }

  try {
    const client = getClient(apiKey);
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: [{ role: 'user', content: userMessage }],
    });

    const block = response.content[0];
    if (block.type === 'text') return block.text;
    return '';
  } catch (err) {
    // Auto-fallback to CLI on API errors (credit exhausted, invalid key, etc.)
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('credit') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('invalid')) {
      console.warn('[claude] API failed, falling back to CLI:', errMsg);
      return cliCompletion(systemPrompt, userMessage);
    }
    throw err;
  }
}

export async function streamChatResponse(
  apiKey: string | null,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  // CLI fallback — concat messages into single prompt
  if (!apiKey) {
    const combined = messages.map((m) =>
      m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`
    ).join('\n\n');
    return cliCompletion(systemPrompt, combined);
  }

  try {
    const client = getClient(apiKey);
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const block = response.content[0];
    if (block.type === 'text') return block.text;
    return '';
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('credit') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('invalid')) {
      console.warn('[claude] API failed, falling back to CLI:', errMsg);
      const combined = messages.map((m) =>
        m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`
      ).join('\n\n');
      return cliCompletion(systemPrompt, combined);
    }
    throw err;
  }
}

export async function generateCompletionWithImage(
  apiKey: string | null,
  systemPrompt: string,
  userMessage: string,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png'
): Promise<string> {
  // CLI doesn't support image input — require API key
  if (!apiKey) {
    throw new Error('이미지 분석은 API 키가 필요합니다. 설정에서 Anthropic API 키를 등록해 주세요.');
  }

  const client = getClient(apiKey);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: systemPrompt || undefined,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: userMessage },
        ],
      },
    ],
  });

  const block = response.content[0];
  if (block.type === 'text') return block.text;
  return '';
}
