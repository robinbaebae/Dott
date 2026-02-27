import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const now = new Date();
  const daysBack = 84; // 12 weeks
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack + 1);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select('created_at')
    .eq('user_id', userEmail)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count activities per day
  const countMap: Record<string, number> = {};
  for (const row of data || []) {
    const day = row.created_at.slice(0, 10); // YYYY-MM-DD
    countMap[day] = (countMap[day] || 0) + 1;
  }

  // Build 84-day grid
  const days: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = countMap[dateStr] || 0;
    days.push({ date: dateStr, count, level: toLevel(count) });
  }

  // Calculate streak (consecutive days ending today/yesterday)
  const todayStr = now.toISOString().slice(0, 10);
  let streak = 0;
  let longestStreak = 0;
  let currentRun = 0;

  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      if (streak === 0 && days[i].date !== todayStr) {
        // Check if yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (days[i].date !== yesterday.toISOString().slice(0, 10)) break;
      }
      streak++;
    } else if (streak > 0) {
      break;
    }
  }

  // Longest streak
  for (const day of days) {
    if (day.count > 0) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      currentRun = 0;
    }
  }

  // This month total
  const monthPrefix = todayStr.slice(0, 7); // YYYY-MM
  const totalThisMonth = days
    .filter((d) => d.date.startsWith(monthPrefix))
    .reduce((sum, d) => sum + d.count, 0);

  const todayCount = countMap[todayStr] || 0;

  return NextResponse.json({
    days,
    streak,
    longestStreak,
    totalThisMonth,
    todayCount,
  });
}

function toLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}
