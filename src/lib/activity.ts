import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';

/**
 * Log an activity to the SOT
 */
export async function logActivity(
  actionType: string,
  agentId?: string | null,
  details?: Record<string, unknown>,
  userId?: string | null
) {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      action_type: actionType,
      agent_id: agentId || null,
      details: details || {},
      user_id: userId || null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Get daily activity summary
 */
export async function getDailyActivity(date: string, userId?: string | null) {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  let query = supabaseAdmin
    .from('activity_logs')
    .select('*')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);

  const { data } = await query;
  return data || [];
}

/**
 * Generate daily report with AI analysis
 */
export async function generateDailyReport(date: string, userId?: string | null) {
  const activities = await getDailyActivity(date, userId);

  if (activities.length === 0) {
    return { reportText: '오늘은 기록된 활동이 없습니다.', stats: {} };
  }

  // Aggregate stats
  const stats: Record<string, number> = {};
  for (const a of activities) {
    stats[a.action_type] = (stats[a.action_type] || 0) + 1;
  }

  // Agent activity counts
  const agentStats: Record<string, number> = {};
  for (const a of activities) {
    if (a.agent_id) {
      agentStats[a.agent_id] = (agentStats[a.agent_id] || 0) + 1;
    }
  }

  // Get completed tasks count
  const { count: completedTasks } = await supabaseAdmin
    .from('agent_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('completed_at', `${date}T00:00:00.000Z`)
    .lte('completed_at', `${date}T23:59:59.999Z`);

  const summaryData = JSON.stringify({
    date,
    totalActivities: activities.length,
    actionBreakdown: stats,
    agentActivity: agentStats,
    completedAgentTasks: completedTasks || 0,
  });

  const prompt = `다음 데이터를 바탕으로 오늘의 마케팅 활동 데일리 리포트를 작성해주세요.

데이터:
${summaryData}

리포트 형식:
1. 오늘의 한 줄 요약
2. 주요 활동 (카테고리별)
3. 에이전트 활동 현황
4. 내일 추천 액션 (2-3개)

한국어로, 간결하고 실용적으로 작성해주세요.`;

  const reportText = await generateCompletion('', prompt);

  // Save report
  await supabaseAdmin.from('daily_reports').upsert({
    report_date: date,
    report_text: reportText,
    stats: { actionBreakdown: stats, agentStats, completedTasks: completedTasks || 0 },
    user_id: userId || null,
  }, { onConflict: 'report_date' });

  return { reportText, stats };
}
