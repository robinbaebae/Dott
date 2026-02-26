import { NextResponse } from 'next/server';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { WEEKLY_REPORT_PROMPT } from '@/lib/prompts';
import { supabaseAdmin } from '@/lib/supabase';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

export async function POST() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);


  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();

    // Fetch weekly data in parallel
    const [tasksRes, insightsRes, igPostsRes, threadsRes] = await Promise.all([
      supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', userEmail)
        .gte('created_at', weekAgoISO)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('insights')
        .select('*')
        .eq('user_id', userEmail)
        .gte('created_at', weekAgoISO)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('instagram_posts')
        .select('*')
        .eq('user_id', userEmail)
        .gte('fetched_at', weekAgoISO)
        .order('timestamp', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('threads_posts')
        .select('*')
        .eq('user_id', userEmail)
        .gte('fetched_at', weekAgoISO)
        .order('timestamp', { ascending: false })
        .limit(20),
    ]);

    const tasks = tasksRes.data || [];
    const insights = insightsRes.data || [];
    const igPosts = igPostsRes.data || [];
    const threadsPosts = threadsRes.data || [];

    const doneTasks = tasks.filter((t) => t.status === 'done');
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');

    const dataContext = `
## 이번 주 데이터 (${weekAgo.toLocaleDateString('ko-KR')} ~ ${now.toLocaleDateString('ko-KR')})

### 태스크
- 총 ${tasks.length}개 중 ${doneTasks.length}개 완료, ${inProgressTasks.length}개 진행중
- 완료 태스크: ${doneTasks.map((t) => t.title).join(', ') || '없음'}
- 진행중 태스크: ${inProgressTasks.map((t) => t.title).join(', ') || '없음'}

### 인사이트
- 저장된 인사이트 ${insights.length}개
- 제목 목록: ${insights.map((i) => i.title).join(', ') || '없음'}

### Instagram (최근 ${igPosts.length}개 포스트)
${igPosts.length > 0
  ? igPosts.map((p) =>
    `- "${(p.caption || '').substring(0, 50)}..." | 좋아요: ${p.like_count} | 댓글: ${p.comments_count} | 도달: ${p.reach || 'N/A'} | 저장: ${p.saved || 'N/A'}`
  ).join('\n')
  : '- 데이터 없음'}

### Threads (최근 ${threadsPosts.length}개 포스트)
${threadsPosts.length > 0
  ? threadsPosts.map((p) =>
    `- "${(p.text || '').substring(0, 50)}..." | 좋아요: ${p.like_count} | 답글: ${p.reply_count} | 리포스트: ${p.repost_count}`
  ).join('\n')
  : '- 데이터 없음'}
`;

    const result = await withTimeout(
      generateCompletion(apiKey, WEEKLY_REPORT_PROMPT, dataContext),
      60000,
      '주간 리포트 생성 시간 초과'
    );

    return NextResponse.json({
      report: result,
      stats: {
        totalTasks: tasks.length,
        doneTasks: doneTasks.length,
        insightsCount: insights.length,
        igPostsCount: igPosts.length,
        threadsPostsCount: threadsPosts.length,
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly report' },
      { status: 500 }
    );
  }
}
