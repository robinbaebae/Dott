export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  due_date: string | null;
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
  category: 'beauty' | 'fashion';
  pub_date: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;   // ISO 8601
  end: string;
  allDay: boolean;
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

export type TaskStatus = Task['status'];
export type AutomationType = Automation['type'];
export type TrendCategory = TrendArticle['category'];
