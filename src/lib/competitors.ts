import { supabase } from './supabase';
import { generateCompletion } from './claude';
import { COMPETITOR_BRIEFING_PROMPT, AD_ANALYSIS_PROMPT } from './prompts';
import { Competitor, CompetitorBriefing, CompetitorAd } from '@/types';

// ---- Competitor CRUD ----

export async function getCompetitors(): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addCompetitor(input: {
  name: string;
  website_url?: string;
  meta_page_id?: string;
  sns_handles?: Record<string, string>;
}): Promise<Competitor> {
  const { data, error } = await supabase
    .from('competitors')
    .insert({
      name: input.name,
      website_url: input.website_url || null,
      meta_page_id: input.meta_page_id || null,
      sns_handles: input.sns_handles || {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompetitor(id: string): Promise<void> {
  const { error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---- Briefings ----

export async function getWeeklyBriefing(
  competitorId: string
): Promise<CompetitorBriefing | null> {
  // Get the start of the current week (Monday)
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const weekStart = monday.toISOString().split('T')[0];

  const { data } = await supabase
    .from('competitor_briefings')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('week_start', weekStart)
    .single();

  return data ?? null;
}

export async function generateBriefing(
  competitorId: string
): Promise<CompetitorBriefing> {
  // Get competitor info
  const { data: competitor, error: compError } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', competitorId)
    .single();
  if (compError || !competitor) throw new Error('Competitor not found');

  // Get week start
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const weekStart = monday.toISOString().split('T')[0];

  // Check if briefing already exists
  const existing = await getWeeklyBriefing(competitorId);
  if (existing) return existing;

  // Search for recent news about the competitor
  const { data: articles } = await supabase
    .from('trend_articles')
    .select('title, source, pub_date')
    .or(`title.ilike.%${competitor.name}%`)
    .order('pub_date', { ascending: false })
    .limit(10);

  const articleList = (articles || [])
    .map((a, i) => `${i + 1}. ${a.title} (${a.source || 'unknown'})`)
    .join('\n');

  const userMessage = `경쟁사 정보:
- 이름: ${competitor.name}
- 웹사이트: ${competitor.website_url || 'N/A'}
- SNS: ${JSON.stringify(competitor.sns_handles || {})}

관련 뉴스:
${articleList || '관련 뉴스 없음 - 일반적인 업계 동향 기반으로 작성해주세요.'}

이 경쟁사에 대한 주간 브리핑을 작성해주세요.`;

  const raw = await generateCompletion(COMPETITOR_BRIEFING_PROMPT, userMessage);

  // AI returns JSON: {key_points, items[{category, title, detail, impact, action}]}
  let briefingText = raw;
  let keyPoints: string[] = [];

  try {
    const jsonStr = raw.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const parsed = JSON.parse(jsonStr);
    keyPoints = parsed.key_points || [];
    // Store the full JSON so frontend can render as table
    briefingText = JSON.stringify(parsed);
  } catch {
    // Fallback: store raw text
    const pointMatches = raw.match(/(?:^|\n)\d+\.\s+(.+)/g);
    if (pointMatches) {
      keyPoints = pointMatches.slice(0, 3).map((p) => p.replace(/^\n?\d+\.\s+/, ''));
    }
  }

  const { data, error } = await supabase
    .from('competitor_briefings')
    .insert({
      competitor_id: competitorId,
      week_start: weekStart,
      briefing_text: briefingText,
      key_points: keyPoints,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---- Ad Tracking ----

export async function getCompetitorAds(
  competitorId: string
): Promise<CompetitorAd[]> {
  const { data, error } = await supabase
    .from('competitor_ads')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('discovered_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addCompetitorAd(input: {
  competitor_id: string;
  platform?: string;
  ad_url: string;
  creative_type?: string;
  copy_text?: string;
  cta_text?: string;
}): Promise<CompetitorAd> {
  // Insert the ad
  const { data: ad, error: insertError } = await supabase
    .from('competitor_ads')
    .insert({
      competitor_id: input.competitor_id,
      platform: input.platform || 'meta',
      ad_url: input.ad_url,
      creative_type: input.creative_type || 'image',
      copy_text: input.copy_text || null,
      cta_text: input.cta_text || null,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Generate AI analysis if we have copy text
  if (input.copy_text) {
    try {
      const userMessage = `광고 정보:
- 플랫폼: ${input.platform || 'meta'}
- 크리에이티브 유형: ${input.creative_type || 'image'}
- 카피: ${input.copy_text}
- CTA: ${input.cta_text || 'N/A'}
- URL: ${input.ad_url}

이 광고를 분석해주세요.`;

      const analysis = await generateCompletion(AD_ANALYSIS_PROMPT, userMessage);

      const { data: updated } = await supabase
        .from('competitor_ads')
        .update({ ai_analysis: analysis })
        .eq('id', ad.id)
        .select()
        .single();

      return updated || ad;
    } catch {
      // Return ad without analysis if AI fails
      return ad;
    }
  }

  return ad;
}
