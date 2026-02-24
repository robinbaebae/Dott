import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

// POST — finalize project: create content_calendar entries
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { scheduleDate, scheduleTime } = body;

    // Fetch project
    const { data: project, error: fetchErr } = await supabase
      .from('content_projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const drafts = project.drafts || {};
    const platforms = project.platforms || [];
    const idea = project.ideas?.[project.selected_idea_index ?? 0];
    const targetDate = scheduleDate || new Date().toISOString().split('T')[0];

    // Create calendar entries for each platform
    const calendarEntries = [];
    for (const platform of platforms) {
      const draft = drafts[platform];
      if (!draft) continue;

      const title = draft.title || idea?.title || project.topic;
      const content = draft.content || '';

      const entry = {
        title: `[${platform}] ${title}`,
        platform,
        scheduled_date: targetDate,
        scheduled_time: scheduleTime || null,
        status: scheduleDate ? 'scheduled' : 'draft',
        content,
        notes: project.ai_explanation || '',
      };

      calendarEntries.push(entry);
    }

    if (calendarEntries.length > 0) {
      const { error: insertErr } = await supabase
        .from('content_calendar')
        .insert(calendarEntries);

      if (insertErr) throw insertErr;
    }

    // Update project status
    const { data: updated, error: updateErr } = await supabase
      .from('content_projects')
      .update({
        status: scheduleDate ? 'scheduled' : 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logActivity('content_finalized', 'marketing', {
      projectId: id,
      platforms,
      scheduled: !!scheduleDate,
      calendarEntries: calendarEntries.length,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
