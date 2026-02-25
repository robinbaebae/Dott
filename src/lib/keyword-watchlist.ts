import { supabaseAdmin } from './supabase';
import { KeywordWatchItem } from '@/types';

export async function getWatchlist(userEmail: string): Promise<KeywordWatchItem[]> {
  const { data, error } = await supabaseAdmin
    .from('keyword_watchlist')
    .select('*')
    .eq('user_id', userEmail)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addWatchlistKeyword(
  keyword: string,
  userEmail: string
): Promise<KeywordWatchItem> {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) throw new Error('keyword is required');

  const { data, error } = await supabaseAdmin
    .from('keyword_watchlist')
    .insert({ keyword: normalized, user_id: userEmail })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('이미 추가된 키워드입니다');
    throw error;
  }
  return data;
}

export async function removeWatchlistKeyword(
  id: string,
  userEmail: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('keyword_watchlist')
    .delete()
    .eq('id', id)
    .eq('user_id', userEmail);
  if (error) throw error;
}
