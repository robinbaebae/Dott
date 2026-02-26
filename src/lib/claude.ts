import Anthropic from '@anthropic-ai/sdk';
import { execFile } from 'child_process';
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

function findClaudeCli(): string {
  // Common install paths
  const candidates = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.npm-global/bin/claude`,
    `${process.env.HOME}/.local/bin/claude`,
  ];

  const fs = require('fs');
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch { /* skip */ }
  }
  return 'claude'; // fallback to PATH
}

function runCli(args: string[], timeoutMs = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliPath = findClaudeCli();

    // Filter env vars that cause nested session errors
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;
    delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;

    const child = execFile(cliPath, args, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs,
      env: cleanEnv,
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Claude CLI error: ${stderr || error.message}`));
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

function createClient(apiKey: string) {
  return new Anthropic({ apiKey });
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
    const client = createClient(apiKey);
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
    const client = createClient(apiKey);
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

  const client = createClient(apiKey);
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
