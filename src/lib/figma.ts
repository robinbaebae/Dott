import { supabase } from './supabase';

const FIGMA_API = 'https://api.figma.com/v1';

async function getToken(): Promise<string | null> {
  const { data, error } = await supabase
    .from('figma_tokens')
    .select('personal_access_token')
    .eq('id', 'default')
    .single();

  if (error || !data) return null;
  return data.personal_access_token;
}

async function figmaFetch(path: string, token?: string) {
  const pat = token || (await getToken());
  if (!pat) throw new Error('Figma not connected');

  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { 'X-Figma-Token': pat },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function isFigmaConnected(): Promise<boolean> {
  const pat = await getToken();
  if (!pat) return false;

  try {
    await figmaFetch('/me', pat);
    return true;
  } catch {
    return false;
  }
}

export async function validateToken(token: string): Promise<{ valid: boolean; userName?: string }> {
  try {
    const data = await figmaFetch('/me', token);
    return { valid: true, userName: data.handle || data.email };
  } catch {
    return { valid: false };
  }
}

export function parseFileUrl(url: string): { fileKey: string; nodeId?: string } | null {
  // https://www.figma.com/file/XXXX/Name?node-id=1-2
  // https://www.figma.com/design/XXXX/Name?node-id=1-2
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (!match) return null;

  const fileKey = match[1];
  const nodeIdMatch = url.match(/node-id=([^&]+)/);
  const nodeId = nodeIdMatch ? decodeURIComponent(nodeIdMatch[1]) : undefined;

  return { fileKey, nodeId };
}

export async function getFileInfo(fileKey: string): Promise<{ name: string }> {
  const data = await figmaFetch(`/files/${fileKey}?depth=1`);
  return { name: data.name };
}

export async function getFileImages(
  fileKey: string,
  nodeId?: string
): Promise<{ [nodeId: string]: string }> {
  const ids = nodeId || '0:1'; // default to first page
  const data = await figmaFetch(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`);
  return data.images || {};
}

