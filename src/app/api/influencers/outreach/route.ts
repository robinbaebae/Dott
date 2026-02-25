import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity";
import { generateCompletion } from "@/lib/claude";
import { getBrandGuideContext } from "@/lib/brand-guide";
import { withTimeout } from "@/lib/api-utils";

// POST: Generate cold outreach email for an influencer
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;

  try {
    const body = await req.json();
    const { influencer_id, campaign_goal, campaign_type, budget_range } = body;

    if (!influencer_id) {
      return NextResponse.json(
        { error: "인플루언서 ID는 필수입니다." },
        { status: 400 }
      );
    }

    if (!campaign_goal) {
      return NextResponse.json(
        { error: "캠페인 목표(campaign_goal)는 필수입니다." },
        { status: 400 }
      );
    }

    // 1. Fetch the influencer from DB
    const { data: influencer, error } = await supabaseAdmin
      .from("influencers")
      .select(
        "id, name, handle, platform, followers, engagement_rate, category, bio, email"
      )
      .eq("id", influencer_id)
      .eq("user_id", userEmail)
      .single();

    if (error || !influencer) {
      console.error("[outreach/POST] DB error:", error);
      return NextResponse.json(
        { error: "인플루언서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. Get brand guide context
    const brandContext = await getBrandGuideContext(userEmail);

    // 3. Build AI prompt
    const systemPrompt = `You are an expert marketing copywriter who specializes in influencer outreach.
You write professional, personalized cold outreach emails that feel authentic and compelling.
Your emails are concise, respectful of the influencer's time, and clearly communicate the value proposition.
You also prepare a follow-up email for cases where the initial email doesn't get a response.
Always respond in valid JSON format only, no markdown.`;

    const influencerProfile = [
      `Name: ${influencer.name}`,
      `Handle: @${influencer.handle}`,
      `Platform: ${influencer.platform}`,
      `Followers: ${influencer.followers?.toLocaleString() || "N/A"}`,
      `Engagement Rate: ${influencer.engagement_rate || "N/A"}%`,
      `Category: ${influencer.category || "N/A"}`,
      `Bio: ${influencer.bio || "N/A"}`,
    ].join("\n");

    const userMessage = `## Influencer Profile
${influencerProfile}

## Campaign Details
- Goal: ${campaign_goal}
- Type: ${campaign_type || "Not specified"}
- Budget Range: ${budget_range || "Not specified"}

## Brand Context
${brandContext || "No brand guide available. Write in a professional, friendly tone."}

Write a professional cold outreach email to this influencer for a marketing collaboration.
The email should:
1. Be personalized to the influencer (reference their content/category)
2. Clearly state the collaboration opportunity
3. Highlight mutual benefits
4. Include a clear call-to-action
5. Keep it concise (under 200 words for the body)

Also write a follow-up email (sent 5-7 days later if no response).

Return ONLY a JSON object with this structure:
{
  "subject": "Initial email subject line",
  "body": "Initial email body text",
  "followup_subject": "Follow-up email subject line",
  "followup_body": "Follow-up email body text"
}`;

    // 4. Generate AI completion with timeout
    const aiResponse = await withTimeout(
      generateCompletion(systemPrompt, userMessage),
      30000
    );

    // 5. Parse JSON response
    let emails;
    try {
      const cleaned = aiResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      emails = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error(
        "[outreach/POST] Failed to parse AI response:",
        aiResponse
      );
      return NextResponse.json(
        { error: "AI 응답 파싱에 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    // Validate expected fields
    if (!emails.subject || !emails.body) {
      return NextResponse.json(
        { error: "AI가 올바른 이메일 형식을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    await logActivity(
      "outreach_generated",
      "marketing",
      { influencer_name: influencer.name, handle: influencer.handle, goal: campaign_goal }
    );

    return NextResponse.json({
      influencer: {
        id: influencer.id,
        name: influencer.name,
        handle: influencer.handle,
        email: influencer.email,
      },
      emails,
    });
  } catch (err) {
    console.error("[outreach/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "아웃리치 이메일 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
