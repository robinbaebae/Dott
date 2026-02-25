import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

async function getAuthenticatedClient(userEmail: string) {
  const { data, error } = await supabaseAdmin
    .from('google_tokens')
    .select('*')
    .eq('id', userEmail)
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

    await supabaseAdmin
      .from('google_tokens')
      .update(update)
      .eq('id', userEmail);
  });

  return client;
}

function parseHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export async function getRecentEmails(maxResults = 10, userEmail: string): Promise<GmailMessage[]> {
  const auth = await getAuthenticatedClient(userEmail);
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

export async function createDraft(
  to: string,
  subject: string,
  bodyHtml: string,
  userEmail: string
): Promise<{ draftId: string; messageId: string } | null> {
  const auth = await getAuthenticatedClient(userEmail);
  if (!auth) return null;

  const gmail = google.gmail({ version: 'v1', auth });

  // Build RFC 2822 MIME message
  const messageParts = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    bodyHtml,
  ];
  const rawMessage = Buffer.from(messageParts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw: rawMessage },
    },
  });

  return {
    draftId: res.data.id!,
    messageId: res.data.message?.id ?? '',
  };
}

export async function getRecentDrafts(maxResults = 5, userEmail: string): Promise<
  { id: string; subject: string; to: string; snippet: string; updated: string }[]
> {
  const auth = await getAuthenticatedClient(userEmail);
  if (!auth) return [];

  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.drafts.list({
    userId: 'me',
    maxResults,
  });

  const drafts = listRes.data.drafts ?? [];
  const result: { id: string; subject: string; to: string; snippet: string; updated: string }[] = [];

  for (const draft of drafts) {
    const detail = await gmail.users.drafts.get({
      userId: 'me',
      id: draft.id!,
      format: 'metadata',
    });

    const headers = (detail.data.message?.payload?.headers ?? []) as { name: string; value: string }[];

    result.push({
      id: draft.id!,
      subject: parseHeader(headers, 'Subject'),
      to: parseHeader(headers, 'To'),
      snippet: detail.data.message?.snippet ?? '',
      updated: parseHeader(headers, 'Date'),
    });
  }

  return result;
}

export async function isGmailConnected(userEmail: string): Promise<boolean> {
  const auth = await getAuthenticatedClient(userEmail);
  if (!auth) return false;

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    await gmail.users.getProfile({ userId: 'me' });
    return true;
  } catch {
    return false;
  }
}
