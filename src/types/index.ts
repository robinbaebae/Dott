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

export type TaskStatus = Task['status'];
export type AutomationType = Automation['type'];
export type TrendCategory = TrendArticle['category'];
