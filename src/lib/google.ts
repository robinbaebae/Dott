import { google } from 'googleapis';
import { supabase } from './supabase';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleCallback(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  const { error } = await supabase
    .from('google_tokens')
    .upsert({
      id: 'default',
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expiry_date: tokens.expiry_date!,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

async function getAuthenticatedClient() {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error || !data) return null;

  const client = getOAuth2Client();
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

export async function getCalendarEvents(timeMin: string, timeMax: string) {
  const auth = await getAuthenticatedClient();
  if (!auth) return [];

  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items ?? []).map((event) => ({
    id: event.id!,
    title: event.summary ?? '(제목 없음)',
    start: event.start?.dateTime ?? event.start?.date ?? '',
    end: event.end?.dateTime ?? event.end?.date ?? '',
    allDay: !event.start?.dateTime,
  }));
}

export async function isConnected(): Promise<boolean> {
  const { data } = await supabase
    .from('google_tokens')
    .select('id')
    .eq('id', 'default')
    .single();

  return !!data;
}

export async function disconnect() {
  await supabase
    .from('google_tokens')
    .delete()
    .eq('id', 'default');
}
