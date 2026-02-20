import { google } from 'googleapis';
import { supabase } from './supabase';

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

async function getAuthenticatedClient() {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error || !data) return null;

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date,
  });

  client.on('tokens', async (tokens) => {
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (tokens.access_token) update.access_token = tokens.access_token;
    if (tokens.expiry_date) update.expiry_date = tokens.expiry_date;

    await supabase
      .from('google_tokens')
      .update(update)
      .eq('id', 'default');
  });

  return client;
}

function parseHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export async function getRecentEmails(maxResults = 10): Promise<GmailMessage[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) return [];

  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'in:inbox',
  });

  const messages = listRes.data.messages ?? [];
  const result: GmailMessage[] = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });

    const headers = (detail.data.payload?.headers ?? []) as { name: string; value: string }[];
    const labelIds = detail.data.labelIds ?? [];

    result.push({
      id: msg.id!,
      threadId: msg.threadId!,
      from: parseHeader(headers, 'From'),
      subject: parseHeader(headers, 'Subject'),
      snippet: detail.data.snippet ?? '',
      date: parseHeader(headers, 'Date'),
      isUnread: labelIds.includes('UNREAD'),
    });
  }

  return result;
}

export async function isGmailConnected(): Promise<boolean> {
  const auth = await getAuthenticatedClient();
  if (!auth) return false;

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    await gmail.users.getProfile({ userId: 'me' });
    return true;
  } catch {
    return false;
  }
}
