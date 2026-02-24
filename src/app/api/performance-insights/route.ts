import { NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';
import { PERFORMANCE_INSIGHTS_PROMPT } from '@/lib/prompts';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/api-utils';

export async function POST() {
  try {
    const [igRes, threadsRes] = await Promise.all([
      supabase
        .from('instagram_posts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(30),
      supabase
        .from('threads_posts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(30),
    ]);

    const igPosts = igRes.data || [];
    const threadsPosts = threadsRes.data || [];

    if (igPosts.length === 0 && threadsPosts.length === 0) {
      return NextResponse.json({
        analysis: '분석할 SNS 데이터가 없습니다. Instagram 또는 Threads를 연동해주세요.',
        hasData: false,
      });
    }

    const dataContext = `
## Instagram 게시물 (${igPosts.length}개)
${igPosts.map((p, i) =>
  `${i + 1}. 날짜: ${p.timestamp || 'N/A'} | 타입: ${p.media_type} | 좋아요: ${p.like_count} | 댓글: ${p.comments_count} | 도달: ${p.reach || 'N/A'} | 노출: ${p.impressions || 'N/A'} | 저장: ${p.saved || 'N/A'} | 캡션: "${(p.caption || '').substring(0, 80)}..."`
).join('\n')}

## Threads 게시물 (${threadsPosts.length}개)
${threadsPosts.map((p, i) =>
  `${i + 1}. 날짜: ${p.timestamp || 'N/A'} | 좋아요: ${p.like_count} | 답글: ${p.reply_count} | 리포스트: ${p.repost_count} | 인용: ${p.quote_count} | 텍스트: "${(p.text || '').substring(0, 80)}..."`
).join('\n')}
`;

    const result = await withTimeout(
      generateCompletion(PERFORMANCE_INSIGHTS_PROMPT, dataContext),
      60000,
      '성과 분석 시간 초과'
    );

    return NextResponse.json({
      analysis: result,
      hasData: true,
      stats: {
        igPostsCount: igPosts.length,
        threadsPostsCount: threadsPosts.length,
        totalLikes: igPosts.reduce((sum, p) => sum + (p.like_count || 0), 0) +
          threadsPosts.reduce((sum, p) => sum + (p.like_count || 0), 0),
        totalComments: igPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0) +
          threadsPosts.reduce((sum, p) => sum + (p.reply_count || 0), 0),
      },
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Performance insights error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze performance' },
      { status: 500 }
    );
  }
}
