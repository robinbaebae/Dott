import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity";

// GET: List campaigns, optionally filtered by influencer_id
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const influencerId = searchParams.get("influencer_id");

    let query = supabaseAdmin
      .from("influencer_campaigns")
      .select("*, influencers(name)")
      .eq("user_id", userEmail)
      .order("created_at", { ascending: false });

    if (influencerId) {
      query = query.eq("influencer_id", influencerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[campaigns/GET] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the joined influencer name
    const campaigns = (data || []).map((campaign: any) => ({
      ...campaign,
      influencer_name: campaign.influencers?.name || null,
      influencers: undefined,
    }));

    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("[campaigns/GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "캠페인 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: Create a new campaign
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const body = await req.json();
    const {
      name,
      influencer_id,
      status,
      campaign_type,
      budget,
      deliverables,
      start_date,
      end_date,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "캠페인 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("influencer_campaigns")
      .insert({
        user_id: userEmail,
        name,
        influencer_id: influencer_id || null,
        status: status || "identified",
        campaign_type: campaign_type || null,
        budget: budget || null,
        deliverables: deliverables || null,
        start_date: start_date || null,
        end_date: end_date || null,
        notes: notes || null,
      })
      .select("*, influencers(name)")
      .single();

    if (error) {
      console.error("[campaigns/POST] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(
      "campaign_created",
      "marketing",
      { name, campaign_type: campaign_type || null }
    );

    return NextResponse.json(
      {
        campaign: {
          ...data,
          influencer_name: data.influencers?.name || null,
          influencers: undefined,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[campaigns/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "캠페인 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: Update a campaign (commonly status changes)
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const body = await req.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "캠페인 id는 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("influencer_campaigns")
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userEmail)
      .select("*, influencers(name)")
      .single();

    if (error) {
      console.error("[campaigns/PATCH] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(
      "campaign_updated",
      "marketing",
      { name: data.name, fields: Object.keys(updateFields) }
    );

    return NextResponse.json({
      campaign: {
        ...data,
        influencer_name: data.influencers?.name || null,
        influencers: undefined,
      },
    });
  } catch (err) {
    console.error("[campaigns/PATCH] Unexpected error:", err);
    return NextResponse.json(
      { error: "캠페인 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: Remove a campaign by id
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "삭제할 캠페인 id가 필요합니다." },
        { status: 400 }
      );
    }

    // Fetch name before deleting for the activity log
    const { data: existing } = await supabaseAdmin
      .from("influencer_campaigns")
      .select("name")
      .eq("id", id)
      .eq("user_id", userEmail)
      .single();

    const { error } = await supabaseAdmin
      .from("influencer_campaigns")
      .delete()
      .eq("id", id)
      .eq("user_id", userEmail);

    if (error) {
      console.error("[campaigns/DELETE] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(
      "campaign_deleted",
      "marketing",
      { name: existing?.name || id }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[campaigns/DELETE] Unexpected error:", err);
    return NextResponse.json(
      { error: "캠페인 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
