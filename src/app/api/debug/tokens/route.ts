import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  // Check if google_tokens table exists and has data
  const { data, error } = await supabaseAdmin
    .from('google_tokens')
    .select('id, expiry_date, updated_at')
    .eq('id', userEmail)
    .single();

  return NextResponse.json({
    tableAccessible: !error || error.code !== '42P01', // 42P01 = table not found
    hasToken: !!data,
    error: error ? { message: error.message, code: error.code, details: error.details } : null,
    tokenInfo: data ? {
      id: data.id,
      expiry_date: data.expiry_date,
      updated_at: data.updated_at,
      isExpired: data.expiry_date ? data.expiry_date < Date.now() : null,
    } : null,
  });
}
