import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function GET() {
  const { data, error } = await supabase
    .from('brand_guide')
    .select('*')
    .eq('id', 'default')
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
    });
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from('brand_guide')
    .upsert({
      id: 'default',
      brand_name: body.brand_name ?? '',
      brand_description: body.brand_description ?? '',
      target_audience: body.target_audience ?? '',
      tone: body.tone ?? 'professional',
      keywords: body.keywords ?? [],
      avoid_keywords: body.avoid_keywords ?? [],
      website_url: body.website_url ?? '',
      additional_notes: body.additional_notes ?? '',
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
