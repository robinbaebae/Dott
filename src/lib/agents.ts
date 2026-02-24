import { supabase } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { ORCHESTRATOR_CLASSIFY_PROMPT, AGENT_PROMPTS } from '@/lib/agent-prompts';
import { getWebSearchContext } from '@/lib/web-search';
import { withTimeout } from '@/lib/api-utils';

interface ClassifyResult {
  agentId: string;
  skill: string;
  reasoning: string;
  isAsync: boolean;
  needsWebSearch: boolean;
  searchQuery: string;
}

interface AgentExecutionResult {
  response: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  skill: string;
  taskId?: string;
  webSearchUsed?: boolean;
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
export async function classifyTask(message: string): Promise<ClassifyResult> {
  try {
    const prompt = `${ORCHESTRATOR_CLASSIFY_PROMPT}\n\n---\nUser input: ${message}`;
    const result = await withTimeout(
      generateCompletion('', prompt),
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
 * Full pipeline: classify → (web search) → execute agent
 */
export async function runAgentPipeline(
  message: string
): Promise<AgentExecutionResult> {
  // 1. Classify
  const classification = await classifyTask(message);

  // 2. Web search if needed
  let webContext = '';
  if (classification.needsWebSearch && classification.searchQuery) {
    webContext = await getWebSearchContext(classification.searchQuery);
  }

  // 3. Execute
  const enrichedMessage = webContext
    ? `${message}\n\n${webContext}`
    : message;

  return executeAgentTask(
    classification.agentId,
    enrichedMessage,
    classification.skill,
    webContext.length > 0
  );
}

/**
 * Execute agent task with timeout and web search integration
 */
export async function executeAgentTask(
  agentId: string,
  message: string,
  skill?: string,
  webSearchUsed?: boolean
): Promise<AgentExecutionResult> {
  const info = AGENT_INFO[agentId] || AGENT_INFO.marketing;
  const systemPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.marketing;

  // Create task record
  const { data: taskRecord } = await supabase
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
      generateCompletion(systemPrompt, message),
      90000,
      `${info.name_ko} 응답 시간 초과`
    );

    // Update task as completed
    if (taskRecord?.id) {
      await supabase
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
      await supabase
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
export async function getAgentStatus() {
  const { data } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'running')
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Get agent task history
 */
export async function getAgentHistory(agentId: string, limit = 20) {
  const { data } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get all agents
 */
export async function getAgents() {
  const { data } = await supabase
    .from('agents')
    .select('*')
    .order('created_at');

  return data || [];
}
