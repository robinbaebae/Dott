import { supabase } from '@/lib/supabase';
import type { BrandGuide } from '@/types';

/**
 * Fetch brand guide and format as context string for agent prompts.
 * Returns empty string if no brand guide is configured.
 */
export async function getBrandGuideContext(): Promise<string> {
  try {
    const { data } = await supabase
      .from('brand_guide')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!data || !data.brand_name) return '';

    const guide = data as BrandGuide;
    const parts: string[] = [
      `--- Brand Guide ---`,
      `브랜드: ${guide.brand_name}`,
    ];

    if (guide.brand_description) parts.push(`설명: ${guide.brand_description}`);
    if (guide.target_audience) parts.push(`타겟: ${guide.target_audience}`);
    if (guide.tone) parts.push(`톤앤매너: ${guide.tone}`);
    if (guide.keywords?.length) parts.push(`핵심 키워드: ${guide.keywords.join(', ')}`);
    if (guide.avoid_keywords?.length) parts.push(`지양 키워드: ${guide.avoid_keywords.join(', ')}`);
    if (guide.website_url) parts.push(`웹사이트: ${guide.website_url}`);
    if (guide.additional_notes) parts.push(`참고: ${guide.additional_notes}`);

    parts.push(
      `이 브랜드 가이드를 참고하여 브랜드 톤과 키워드에 맞는 답변을 작성하세요.`,
      `---`
    );

    return parts.join('\n');
  } catch {
    return '';
  }
}
