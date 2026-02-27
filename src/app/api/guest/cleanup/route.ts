import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { GUEST_USER_ID } from '@/lib/auth-guard';

const GUEST_TABLES = [
  'chat_messages',      // depends on chat_sessions, delete first
  'chat_sessions',
  'email_sequence_items',
  'email_sequences',
  'email_drafts',
  'promotion_channels',
  'promotion_canvas',
  'promotions',
  'content_calendar',
  'content_projects',
  'ad_creative_projects',
  'influencer_campaigns',
  'influencers',
  'figma_push_queue',
  'figma_extractions',
  'figma_designs',
  'figma_tokens',
  'seo_briefs',
  'banner',
  'tasks',
  'insights',
  'memos',
  'automation',
  'expenses',
  'brand_guide',
  'custom_rss_feeds',
  'weekly_goals',
  'token_usage',
  'activity_logs',
  'daily_reports',
  'notification_settings',
  'user_settings',
];

/**
 * POST /api/guest/cleanup
 * Delete all data belonging to guest@local.
 * Called by Electron main process on app quit.
 */
export async function POST() {
  let deleted = 0;
  const errors: string[] = [];

  for (const table of GUEST_TABLES) {
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', GUEST_USER_ID);

      if (error) {
        // Table might not exist or have different schema — skip
        errors.push(`${table}: ${error.message}`);
      } else {
        deleted++;
      }
    } catch {
      // skip
    }
  }

  return NextResponse.json({
    ok: true,
    tablesCleared: deleted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
