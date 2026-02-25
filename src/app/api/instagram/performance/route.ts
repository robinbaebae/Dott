import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // Fetch recent posts (last 30 days) to calculate average engagement rate
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: posts } = await supabaseAdmin
    .from('instagram_posts')
    .select('like_count, comments_count, impressions, reach, saved, engagement, timestamp')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .order('timestamp', { ascending: false });

  if (!posts || posts.length === 0) {
    return NextResponse.json({ avg_engagement_rate: 0, post_count: 0, recent_posts: [] });
  }

  // Calculate engagement rates
  const rates = posts.map((p) => {
    const interactions = (p.like_count || 0) + (p.comments_count || 0) + (p.saved || 0);
    const reach = p.reach || p.impressions || 1;
    return interactions / reach;
  });

  const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;

  // Recent 48h posts with their engagement
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const recentPosts = posts
    .filter((p) => new Date(p.timestamp) >= twoDaysAgo)
    .map((p, i) => ({
      ...p,
      engagement_rate: rates[i],
      vs_average: rates[i] / (avgRate || 1),
    }));

  return NextResponse.json({
    avg_engagement_rate: avgRate,
    post_count: posts.length,
    recent_posts: recentPosts,
  });
}
