import { supabaseAdmin } from '@/lib/supabase';
import type { BrandGuide } from '@/types';

/**
 * Fetch brand guide and format as context string for agent prompts.
 * Returns empty string if no brand guide is configured.
 */
export async function getBrandGuideContext(userEmail: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('brand_guide')
      .select('*')
      .eq('id', userEmail)
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

    // Product Context
    if (guide.product_type) parts.push(`제품 유형: ${guide.product_type}`);
    if (guide.industry) parts.push(`산업: ${guide.industry}`);
    if (guide.competitors?.length) parts.push(`경쟁사: ${guide.competitors.join(', ')}`);
    if (guide.usp) parts.push(`USP: ${guide.usp}`);
    if (guide.pricing_model) parts.push(`가격 모델: ${guide.pricing_model}`);
    if (guide.customer_pain_points?.length) parts.push(`고객 페인포인트: ${guide.customer_pain_points.join(', ')}`);
    if (guide.key_features?.length) parts.push(`핵심 기능: ${guide.key_features.join(', ')}`);
    if (guide.company_size) parts.push(`기업 규모: ${guide.company_size}`);

    parts.push(
      `이 브랜드 가이드를 참고하여 브랜드 톤과 키워드에 맞는 답변을 작성하세요.`,
      `---`
    );

    return parts.join('\n');
  } catch {
    return '';
  }
}
