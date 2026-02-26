import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

// CORS headers for Figma plugin access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonWithCors(data: unknown, init?: { status?: number }) {
  const res = NextResponse.json(data, init);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// OPTIONS: Preflight for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST: Upload PNG image + create push queue record
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const size = (formData.get('size') as string) || '1080x1080';
    const prompt = (formData.get('prompt') as string) || '';
    const figmaFileKey = (formData.get('figmaFileKey') as string) || '';

    if (!file) {
      return jsonWithCors({ error: 'image file is required' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileName = `${userEmail}/${Date.now()}.png`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from('figma-pushes')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[auto-push] Upload error:', uploadError);
      return jsonWithCors({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('figma-pushes')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Create push queue record
    const { data: record, error: insertError } = await supabaseAdmin
      .from('figma_push_queue')
      .insert({
        user_id: userEmail,
        image_url: imageUrl,
        size,
        prompt,
        figma_file_key: figmaFileKey || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[auto-push] Insert error:', insertError);
      return jsonWithCors({ error: insertError.message }, { status: 500 });
    }

    return jsonWithCors(record, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[auto-push] POST error:', message);
    return jsonWithCors({ error: message }, { status: 500 });
  }
}

// GET: Fetch pending pushes for a user (used by Figma plugin polling)
export async function GET(req: NextRequest) {
  // Plugin auth via query param (simple token = user email)
  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) {
    // Try session auth
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { data, error } = await supabaseAdmin
      .from('figma_push_queue')
      .select('*')
      .eq('user_id', userEmail)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return jsonWithCors({ error: error.message }, { status: 500 });
    return jsonWithCors(data);
  }

  // Plugin polling - only return pending items
  const { data, error } = await supabaseAdmin
    .from('figma_push_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) return jsonWithCors({ error: error.message }, { status: 500 });
  return jsonWithCors(data);
}

// PATCH: Update push status (used by Figma plugin after processing)
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return jsonWithCors({ error: 'id and status are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('figma_push_queue')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return jsonWithCors({ error: error.message }, { status: 500 });
    return jsonWithCors({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonWithCors({ error: message }, { status: 500 });
  }
}
