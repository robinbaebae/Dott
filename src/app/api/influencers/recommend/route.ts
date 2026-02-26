import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity";
import { generateCompletion, getUserApiKey } from "@/lib/claude";
import { withTimeout } from "@/lib/api-utils";

// POST: AI-powered influencer recommendation
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const userEmail = authResult;
  const apiKey = await getUserApiKey(userEmail);


  try {
    const body = await req.json();
    const { goal, budget, platform, category } = body;

    if (!goal) {
      return NextResponse.json(
        { error: "캠페인 목표(goal)는 필수입니다." },
        { status: 400 }
      );
    }

    // 1. Fetch all influencers for this user
    let query = supabaseAdmin
      .from("influencers")
      .select(
        "id, name, handle, platform, followers, engagement_rate, category, price_range, bio"
      )
      .eq("user_id", userEmail);

    if (platform) {
      query = query.eq("platform", platform);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data: influencers, error } = await query;

    if (error) {
      console.error("[recommend/POST] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!influencers || influencers.length === 0) {
      return NextResponse.json(
        {
          error:
            "등록된 인플루언서가 없습니다. 먼저 인플루언서를 추가해주세요.",
        },
        { status: 404 }
      );
    }

    // 2. Build influencer summary for the prompt
    const influencerSummary = influencers
      .map(
        (inf) =>
          `- ID: ${inf.id} | ${inf.name} (@${inf.handle}) | 플랫폼: ${inf.platform} | 팔로워: ${inf.followers?.toLocaleString() || "N/A"} | 참여율: ${inf.engagement_rate || "N/A"}% | 카테고리: ${inf.category || "N/A"} | 단가: ${inf.price_range || "N/A"}`
      )
      .join("\n");

    // 3. AI prompt
    const systemPrompt = `You are an expert marketing strategist specializing in influencer marketing.
Your task is to analyze a list of influencers and recommend the top 3 matches for a given campaign goal.
Consider factors like audience alignment, engagement rate, follower count, price range vs budget, and category relevance.
Always respond in valid JSON format only, no markdown.`;

    const userMessage = `## Campaign Details
- Goal: ${goal}
- Budget: ${budget || "Not specified"}
- Preferred Platform: ${platform || "Any"}
- Preferred Category: ${category || "Any"}

## Available Influencers
${influencerSummary}

Based on these influencers and the campaign goal, recommend the top 3 best matches.
Return ONLY a JSON array with this structure:
[
  {
    "influencer_id": "uuid",
    "name": "influencer name",
    "score": 95,
    "reasoning": "Brief explanation of why this influencer is a good match"
  }
]
If fewer than 3 influencers are available, return as many as possible.
Score should be 0-100 based on overall fit.`;

    // 4. Generate AI recommendation with timeout
    const aiResponse = await withTimeout(
      generateCompletion(apiKey, systemPrompt, userMessage),
      30000
    );

    // 5. Parse JSON response
    let recommendations;
    try {
      // Handle cases where AI wraps response in markdown code blocks
      const cleaned = aiResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      recommendations = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[recommend/POST] Failed to parse AI response:", aiResponse);
      return NextResponse.json(
        { error: "AI 응답 파싱에 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    await logActivity(
      "influencer_recommendation",
      "marketing",
      { goal, count: recommendations.length }
    );

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("[recommend/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "인플루언서 추천 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
