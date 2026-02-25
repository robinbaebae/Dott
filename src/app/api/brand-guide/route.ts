import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { data, error } = await supabaseAdmin
    .from('brand_guide')
    .select('*')
    .eq('id', userEmail)
    .single();

  if (error) {
    // Table or row might not exist yet — return defaults
    return NextResponse.json({
      id: 'default',
      brand_name: '',
      brand_description: '',
      target_audience: '',
      tone: 'professional',
      keywords: [],
      avoid_keywords: [],
      website_url: '',
      additional_notes: '',
      product_type: '',
      industry: '',
      competitors: [],
      usp: '',
      pricing_model: '',
      customer_pain_points: [],
      key_features: [],
      company_size: '',
    });
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from('brand_guide')
    .upsert({
      id: userEmail,
      brand_name: body.brand_name ?? '',
      brand_description: body.brand_description ?? '',
      target_audience: body.target_audience ?? '',
      tone: body.tone ?? 'professional',
      keywords: body.keywords ?? [],
      avoid_keywords: body.avoid_keywords ?? [],
      website_url: body.website_url ?? '',
      additional_notes: body.additional_notes ?? '',
      product_type: body.product_type ?? '',
      industry: body.industry ?? '',
      competitors: body.competitors ?? [],
      usp: body.usp ?? '',
      pricing_model: body.pricing_model ?? '',
      customer_pain_points: body.customer_pain_points ?? [],
      key_features: body.key_features ?? [],
      company_size: body.company_size ?? '',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('brand_guide_update', null, {
    brand_name: body.brand_name,
  });

  return NextResponse.json(data);
}
