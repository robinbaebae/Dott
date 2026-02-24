export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'on_hold';
  due_date: string | null;
  urgent: boolean;
  important: boolean;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Automation {
  id: string;
  name: string;
  type: 'content_generation' | 'ad_report' | 'brand_copy';
  prompt_template: string;
  last_result: string | null;
  last_run_at: string | null;
  created_at: string;
}

export interface TrendArticle {
  id: string;
  title: string;
  link: string;
  source: string | null;
  category: 'ai' | 'planning' | 'marketing' | 'tech';
  pub_date: string | null;
  created_at: string;
}

export interface KeywordTrend {
  id: string;
  keyword: string;
  count: number;
  snapshot_date: string;
  source: string;
  related_article_ids: string[];
  created_at: string;
}

export interface TrendSummary {
  id: string;
  summary_date: string;
  summary_text: string;
  article_ids: string[];
  created_at: string;
}

export interface Competitor {
  id: string;
  name: string;
  website_url: string | null;
  meta_page_id: string | null;
  sns_handles: Record<string, string>;
  created_at: string;
}

export interface CompetitorBriefing {
  id: string;
  week_start: string;
  competitor_id: string;
  briefing_text: string;
  key_points: string[];
  stats: Record<string, unknown>;
  created_at: string;
}

export interface CompetitorAd {
  id: string;
  competitor_id: string;
  platform: string;
  ad_url: string;
  creative_type: string;
  copy_text: string | null;
  cta_text: string | null;
  ai_analysis: string | null;
  screenshot_url: string | null;
  discovered_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;   // ISO 8601
  end: string;
  allDay: boolean;
  attendees?: { name: string; email: string }[];
}

export interface BannerDesign {
  id: string;
  copy: string;
  reference: string | null;
  size: string;
  html: string;
  created_at: string;
}

export interface InstagramPost {
  id: string;
  ig_id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  impressions: number | null;
  reach: number | null;
  saved: number | null;
  engagement: number | null;
  fetched_at: string;
}

export interface ThreadsPost {
  id: string;
  text: string;
  media_type: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  reply_count: number;
  repost_count: number;
  quote_count: number;
  fetched_at: string;
}

export interface Insight {
  id: string;
  url: string;
  title: string;
  description: string;
  memo: string;
  tags: string[];
  content_type: 'article' | 'video' | 'tweet' | 'pdf' | 'other' | 'memory' | 'swipe';
  thumbnail_url: string;
  source_domain: string;
  swipe_category?: string;
  created_at: string;
}

export interface ContentCalendarItem {
  id: string;
  title: string;
  platform: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'draft' | 'scheduled' | 'published';
  content: string;
  notes: string;
  created_at: string;
}

export type QuickActionType =
  | 'template'
  | 'email'
  | 'repurpose'
  | 'ad-copy'
  | 'utm'
  | 'banner'
  | 'ad-banner'
  | 'calendar'
  | 'content';

export type TaskStatus = Task['status'];
export type AutomationType = Automation['type'];
export type TrendCategory = TrendArticle['category'];
export type InsightContentType = Insight['content_type'];

// Email
export interface EmailDraft {
  id: string;
  gmail_draft_id: string | null;
  gmail_message_id: string | null;
  to_email: string;
  subject: string;
  body_html: string;
  status: 'local' | 'drafted' | 'sent';
  created_at: string;
}

export interface GmailDraft {
  id: string;
  message: {
    id: string;
    threadId: string;
  };
  subject: string;
  to: string;
  snippet: string;
  updated: string;
}

// Figma
export interface FigmaPush {
  id: string;
  file_key: string;
  file_name: string;
  node_id: string | null;
  screenshot_url: string | null;
  banner_id: string | null;
  figma_url: string | null;
  status: 'pending' | 'pushing' | 'done' | 'failed';
  extracted_at: string;
}

// Knowbar (dashboard prompt)
export interface KnowbarAgentResponse {
  response: string;
  agentId?: string;
  agentName?: string;
  agentIcon?: string;
  skill?: string;
  taskCreated?: boolean;
  taskTitle?: string;
  memoryCreated?: boolean;
  bannerId?: string;
}

export interface KnowbarMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentName?: string;
  agentIcon?: string;
  skill?: string;
  taskCreated?: boolean;
  taskTitle?: string;
  memoryCreated?: boolean;
  bannerId?: string;
  bannerHtml?: string;
  figmaUrl?: string;
}

export const TREND_CATEGORIES: { value: TrendCategory; label: string }[] = [
  { value: 'marketing', label: '마케팅' },
  { value: 'planning', label: '기획' },
  { value: 'ai', label: 'AI' },
  { value: 'tech', label: '테크/SaaS' },
];

// Agent types
export interface Agent {
  id: string;
  name: string;
  name_ko: string;
  role: string;
  description: string | null;
  skills: string[];
  system_prompt: string | null;
  icon: string | null;
  created_at: string;
}

export interface AgentTask {
  id: string;
  agent_id: string;
  input_text: string;
  output_text: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  skill_used: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action_type: string;
  agent_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  report_text: string;
  stats: Record<string, unknown>;
  created_at: string;
}

// Brand Guide
export interface BrandGuide {
  id: string;
  brand_name: string;
  brand_description: string;
  target_audience: string;
  tone: 'formal' | 'casual' | 'friendly' | 'playful' | 'professional';
  keywords: string[];
  avoid_keywords: string[];
  website_url: string;
  additional_notes: string;
  updated_at: string;
}

export const TONE_OPTIONS: { value: BrandGuide['tone']; label: string }[] = [
  { value: 'professional', label: '프로페셔널' },
  { value: 'formal', label: '포멀' },
  { value: 'friendly', label: '친근한' },
  { value: 'casual', label: '캐주얼' },
  { value: 'playful', label: '발랄한' },
];

// Content Project (AI workflow)
export type ContentProjectStatus =
  | 'idea_proposed'
  | 'topic_selected'
  | 'drafting'
  | 'review'
  | 'confirmed'
  | 'scheduled'
  | 'published';

export interface ContentIdea {
  title: string;
  message: string;
  platform_fit: Record<string, number>;
  hook: string;
}

export interface ContentDraft {
  content: string;
  hashtags?: string[];
  image_description?: string;
  title?: string;
  meta_description?: string;
}

export interface ContentProject {
  id: string;
  topic: string;
  platforms: string[];
  status: ContentProjectStatus;
  ideas: ContentIdea[];
  selected_idea_index: number | null;
  drafts: Record<string, ContentDraft>;
  banner_id: string | null;
  banner_html: string | null;
  ai_explanation: string | null;
  user_notes: string;
  created_at: string;
  updated_at: string;
}

// Ad Creative Pipeline
export type AdPipelineStatus = 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5' | 'completed';

export interface AdCreativeProject {
  id: string;
  name: string;
  status: AdPipelineStatus;
  template_config: Record<string, unknown>;
  creatives: Array<{ banner_id: string; size: string; copy: string }>;
  ad_copies: Array<{ creative_index: number; headline: string; primary_text: string; description: string; cta: string }>;
  campaign_config: Record<string, unknown>;
  campaign_id: string | null;
  performance_data: Record<string, unknown>;
  ai_report: string | null;
  created_at: string;
  updated_at: string;
}
