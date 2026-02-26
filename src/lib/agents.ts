import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { ORCHESTRATOR_CLASSIFY_PROMPT, AGENT_PROMPTS } from '@/lib/agent-prompts';
import { getWebSearchContext } from '@/lib/web-search';
import { getInstagramContextForChat } from '@/lib/instagram';
import { getMetaAdsContextForChat } from '@/lib/meta-ads';
import { getRecentAttendees } from '@/lib/google';
import { getBrandGuideContext } from '@/lib/brand-guide';
import { getMemosContextForChat } from '@/lib/memos-context';
import { withTimeout } from '@/lib/api-utils';

interface ClassifyResult {
  agentId: string;
  skill: string;
  reasoning: string;
  isAsync: boolean;
  needsWebSearch: boolean;
  searchQuery: string;
}

export interface AgentExecutionResult {
  response: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  skill: string;
  taskId?: string;
  webSearchUsed?: boolean;
}

export interface PipelineOptions {
  /** Conversation history (last N messages) */
  history?: { role: string; content: string }[];
  /** Extra instructions appended to the message (e.g. detection tags) */
  extraInstructions?: string;
  /** User email for multi-user context fetching */
  userEmail?: string;
}

// Agent metadata
const AGENT_INFO: Record<string, { name: string; icon: string; name_ko: string }> = {
  orchestrator: { name: 'Orchestrator', icon: '🎯', name_ko: '오케스트레이터' },
  marketing: { name: 'Marketing Expert', icon: '📢', name_ko: '마케팅 전문가' },
  design: { name: 'Design Expert', icon: '🎨', name_ko: '디자인 전문가' },
  research: { name: 'Research Expert', icon: '🔍', name_ko: '리서치 전문가' },
  service_builder: { name: 'Service Builder', icon: '🛠️', name_ko: '서비스 빌더' },
};

/**
 * Classify user input via Orchestrator
 */
export async function classifyTask(apiKey: string | null, message: string): Promise<ClassifyResult> {
  try {
    const prompt = `${ORCHESTRATOR_CLASSIFY_PROMPT}\n\n---\nUser input: ${message}`;
    const result = await withTimeout(
      generateCompletion(apiKey, '', prompt),
      15000,
      '분류 시간 초과'
    );

    const jsonMatch = result.match(/\{[\s\S]*?"agentId"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        agentId: parsed.agentId || 'marketing',
        skill: parsed.skill || '',
        reasoning: parsed.reasoning || '',
        isAsync: parsed.isAsync || false,
        needsWebSearch: parsed.needsWebSearch || false,
        searchQuery: parsed.searchQuery || '',
      };
    }
  } catch (err) {
    console.error('Classification failed:', err);
  }

  return {
    agentId: 'marketing',
    skill: '',
    reasoning: 'Default routing',
    isAsync: false,
    needsWebSearch: false,
    searchQuery: '',
  };
}

/**
 * Full pipeline: classify → gather context → execute agent
 *
 * Context gathered automatically:
 * - Web search (if classifier says needsWebSearch)
 * - Instagram analytics
 * - Meta Ads analytics
 * - Recent meeting attendees (if meeting-related conversation)
 * - Conversation history (from options)
 */
export async function runAgentPipeline(
  message: string,
  options: PipelineOptions = {}
): Promise<AgentExecutionResult> {
  const { history = [], extraInstructions = '', userEmail = '' } = options;

  // 0. Get API key
  const apiKey = await getUserApiKey(userEmail);


  // 1. Classify (on raw message)
  let classification: ClassifyResult;
  try {
    classification = await classifyTask(apiKey, message);
  } catch {
    classification = {
      agentId: 'marketing', skill: '', reasoning: 'fallback',
      isAsync: false, needsWebSearch: false, searchQuery: '',
    };
  }

  // 2. Gather context in parallel
  const contextParts: string[] = [];

  // Detect if user wants to reference memos
  const wantsMemoContext = /메모|노트|기록|아이디어|기획|브레인스토밍|참고해|memo|note|idea/i.test(message);
  // Extract search keywords for memo search (take the core topic from the message)
  const memoSearchQuery = wantsMemoContext ? message.replace(/메모|노트|기록|참고해서|참고해줘|기반으로|활용해서|해줘|해봐|해보자/g, '').trim().slice(0, 50) || undefined : undefined;

  try {
    const contextPromises: Promise<string>[] = [
      getBrandGuideContext(userEmail),
      getInstagramContextForChat(userEmail),
      getMetaAdsContextForChat(userEmail),
      getMemosContextForChat(userEmail, memoSearchQuery),
    ];
    if (classification.needsWebSearch && classification.searchQuery) {
      contextPromises.push(getWebSearchContext(classification.searchQuery));
    }
    const results = await Promise.all(contextPromises);
    contextParts.push(...results.filter(Boolean));
  } catch {
    // context fetch failed — continue without it
  }

  // 3. Build history context
  let historyContext = '';
  if (history.length > 0) {
    historyContext = '\n\n--- Conversation History ---\n' +
      history.map((m) =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n') + '\n---\n\n';
  }

  // 4. Detect meeting context → inject recent attendees
  const allText = historyContext + message;
  const isMeetingContext = /미팅|회의|일정|예약|스케줄|meeting|schedule|캘린더|calendar/i.test(allText);
  if (isMeetingContext) {
    try {
      const recentAttendees = await getRecentAttendees(userEmail);
      if (recentAttendees.length > 0) {
        const list = recentAttendees.slice(0, 50).map(a =>
          `- ${a.name || '(이름 없음)'} <${a.email}> (최근 ${a.count}회 미팅)`
        ).join('\n');
        contextParts.push(
          `--- 최근 미팅 참석자 목록 ---\n${list}\n---\n` +
          `위 목록에서 사용자가 언급한 이름과 일치하는 사람을 찾으세요.\n` +
          `동명이인이 있으면 이메일 주소와 미팅 횟수를 보여주고 어느 분인지 확인하세요.\n` +
          `목록에 없는 사람이면 "이전에 미팅한 기록이 없는데, 이메일 주소를 알려주시겠어요?" 라고 확인하세요.`
        );
      }
    } catch {
      // attendee fetch failed — continue without it
    }
  }

  // 5. Assemble enriched message
  const contextString = contextParts.length > 0
    ? `\n\n--- Context ---\n${contextParts.join('\n\n')}`
    : '';
  const enrichedMessage = historyContext + message + contextString + extraInstructions;

  // 6. Execute via agent
  return executeAgentTask(
    apiKey,
    classification.agentId,
    enrichedMessage,
    classification.skill,
    !!(classification.needsWebSearch && classification.searchQuery)
  );
}

/**
 * Execute agent task with timeout and web search integration
 */
export async function executeAgentTask(
  apiKey: string | null,
  agentId: string,
  message: string,
  skill?: string,
  webSearchUsed?: boolean
): Promise<AgentExecutionResult> {
  const info = AGENT_INFO[agentId] || AGENT_INFO.marketing;
  const systemPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.marketing;

  // Create task record
  const { data: taskRecord } = await supabaseAdmin
    .from('agent_tasks')
    .insert({
      agent_id: agentId,
      input_text: message,
      status: 'running',
      skill_used: skill || null,
      started_at: new Date().toISOString(),
      metadata: { webSearchUsed: webSearchUsed || false },
    })
    .select('id')
    .single();

  try {
    const response = await withTimeout(
      generateCompletion(apiKey, systemPrompt, message),
      90000,
      `${info.name_ko} 응답 시간 초과`
    );

    // Update task as completed
    if (taskRecord?.id) {
      await supabaseAdmin
        .from('agent_tasks')
        .update({
          output_text: response,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskRecord.id);
    }

    return {
      response,
      agentId,
      agentName: info.name,
      agentIcon: info.icon,
      skill: skill || '',
      taskId: taskRecord?.id,
      webSearchUsed: webSearchUsed || false,
    };
  } catch (err) {
    if (taskRecord?.id) {
      await supabaseAdmin
        .from('agent_tasks')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          metadata: { error: String(err), webSearchUsed: webSearchUsed || false },
        })
        .eq('id', taskRecord.id);
    }

    throw err;
  }
}

/**
 * Get agent status (active tasks)
 */
export async function getAgentStatus(userId?: string) {
  let query = supabaseAdmin
    .from('agent_tasks')
    .select('*')
    .eq('status', 'running')
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);

  const { data } = await query;
  return data || [];
}

/**
 * Get agent task history
 */
export async function getAgentHistory(agentId: string, limit = 20, userId?: string) {
  let query = supabaseAdmin
    .from('agent_tasks')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) query = query.eq('user_id', userId);

  const { data } = await query;
  return data || [];
}

/**
 * Get all agents
 */
export async function getAgents() {
  const { data } = await supabaseAdmin
    .from('agents')
    .select('*')
    .order('created_at');

  return data || [];
}
