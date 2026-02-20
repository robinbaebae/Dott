import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Check if google_tokens table exists and has data
  const { data, error } = await supabase
    .from('google_tokens')
    .select('id, expiry_date, updated_at')
    .eq('id', 'default')
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
