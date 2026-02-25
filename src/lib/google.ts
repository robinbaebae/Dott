import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

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

export async function handleCallback(code: string, userEmail: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  const { error } = await supabaseAdmin
    .from('google_tokens')
    .upsert({
      id: userEmail,
      user_id: userEmail,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expiry_date: tokens.expiry_date!,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

async function getAuthenticatedClient(userEmail: string) {
  const { data, error } = await supabaseAdmin
    .from('google_tokens')
    .select('*')
    .eq('id', userEmail)
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

    await supabaseAdmin
      .from('google_tokens')
      .update(update)
      .eq('id', userEmail);
  });

  return client;
}

export async function getCalendarEvents(timeMin: string, timeMax: string, userEmail: string) {
  const auth = await getAuthenticatedClient(userEmail);
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
    attendees: (event.attendees ?? []).map((a) => ({
      name: a.displayName ?? a.email ?? '',
      email: a.email ?? '',
    })),
  }));
}

export async function createCalendarEvent(
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  attendees?: { email: string; displayName?: string }[],
  userEmail?: string
) {
  const auth = await getAuthenticatedClient(userEmail!);
  if (!auth) throw new Error('Google Calendar not connected');

  const calendar = google.calendar({ version: 'v3', auth });
  const requestBody: Record<string, unknown> = {
    summary,
    description,
    start: { dateTime: startTime, timeZone: 'Asia/Seoul' },
    end: { dateTime: endTime, timeZone: 'Asia/Seoul' },
  };

  if (attendees && attendees.length > 0) {
    requestBody.attendees = attendees.map(a => ({
      email: a.email,
      displayName: a.displayName || undefined,
    }));
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody,
    sendUpdates: attendees && attendees.length > 0 ? 'all' : 'none',
  });

  return {
    id: res.data.id,
    title: res.data.summary,
    start: res.data.start?.dateTime || res.data.start?.date,
    end: res.data.end?.dateTime || res.data.end?.date,
    attendees: (res.data.attendees ?? []).map(a => ({
      email: a.email ?? '',
      name: a.displayName ?? '',
    })),
  };
}

/**
 * Get unique attendees from past 90 days of calendar events
 */
export async function getRecentAttendees(userEmail: string): Promise<{ name: string; email: string; count: number }[]> {
  const auth = await getAuthenticatedClient(userEmail);
  if (!auth) return [];

  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: past.toISOString(),
    timeMax: now.toISOString(),
    singleEvents: true,
    maxResults: 500,
  });

  const attendeeMap = new Map<string, { name: string; email: string; count: number }>();

  for (const event of res.data.items ?? []) {
    for (const a of event.attendees ?? []) {
      if (!a.email || a.self) continue;
      const key = a.email.toLowerCase();
      const existing = attendeeMap.get(key);
      if (existing) {
        existing.count++;
        if (a.displayName && !existing.name) existing.name = a.displayName;
      } else {
        attendeeMap.set(key, {
          name: a.displayName ?? '',
          email: a.email,
          count: 1,
        });
      }
    }
  }

  return Array.from(attendeeMap.values()).sort((a, b) => b.count - a.count);
}

export async function isConnected(userEmail: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('google_tokens')
    .select('id')
    .eq('id', userEmail)
    .single();

  return !!data;
}

export async function disconnect(userEmail: string) {
  await supabaseAdmin
    .from('google_tokens')
    .delete()
    .eq('id', userEmail);
}
