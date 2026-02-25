import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity";

// GET: List influencers with optional platform filter and name/handle search
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");
    const search = searchParams.get("search");

    let query = supabaseAdmin
      .from("influencers")
      .select("*")
      .eq("user_id", userEmail)
      .order("created_at", { ascending: false });

    if (platform) {
      query = query.eq("platform", platform);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,handle.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[influencers/GET] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[influencers/GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "인플루언서 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: Create a new influencer
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const body = await req.json();
    const {
      name,
      handle,
      platform,
      followers,
      engagement_rate,
      category,
      bio,
      email,
      phone,
      profile_image_url,
      avg_likes,
      avg_comments,
      price_range,
      notes,
      tags,
    } = body;

    if (!name || !handle || !platform) {
      return NextResponse.json(
        { error: "name, handle, platform은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("influencers")
      .insert({
        user_id: userEmail,
        name,
        handle,
        platform,
        followers: followers || 0,
        engagement_rate: engagement_rate || 0,
        category: category || null,
        bio: bio || null,
        email: email || null,
        phone: phone || null,
        profile_image_url: profile_image_url || null,
        avg_likes: avg_likes || null,
        avg_comments: avg_comments || null,
        price_range: price_range || null,
        notes: notes || null,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error("[influencers/POST] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(
      "influencer_created",
      "marketing",
      { name, handle, platform }
    );

    return NextResponse.json({ influencer: data }, { status: 201 });
  } catch (err) {
    console.error("[influencers/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "인플루언서 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing influencer
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const body = await req.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "인플루언서 id는 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("influencers")
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userEmail)
      .select()
      .single();

    if (error) {
      console.error("[influencers/PATCH] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(
      "influencer_updated",
      "marketing",
      { name: data.name, fields: Object.keys(updateFields) }
    );

    return NextResponse.json({ influencer: data });
  } catch (err) {
    console.error("[influencers/PATCH] Unexpected error:", err);
    return NextResponse.json(
      { error: "인플루언서 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: Remove an influencer by id
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "삭제할 인플루언서 id가 필요합니다." },
        { status: 400 }
      );
    }

    // Fetch name before deleting for the activity log
    const { data: existing } = await supabaseAdmin
      .from("influencers")
      .select("name, handle")
      .eq("id", id)
      .eq("user_id", userEmail)
      .single();

    const { error } = await supabaseAdmin
      .from("influencers")
      .delete()
      .eq("id", id)
      .eq("user_id", userEmail);

    if (error) {
      console.error("[influencers/DELETE] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(
      "influencer_deleted",
      "marketing",
      { name: existing?.name || id, handle: existing?.handle }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[influencers/DELETE] Unexpected error:", err);
    return NextResponse.json(
      { error: "인플루언서 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
