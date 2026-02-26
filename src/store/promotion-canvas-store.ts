import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type Viewport,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

export type PromotionNodeType =
  | 'promotionHub'
  | 'channel'
  | 'message'
  | 'audience'
  | 'budget'
  | 'timeline'
  | 'note';

export interface CanvasState {
  promotionId: string | null;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Undo/Redo
  history: { nodes: Node[]; edges: Edge[] }[];
  historyIndex: number;

  // Actions
  setPromotionId: (id: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (id: string | null) => void;

  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  removeNode: (nodeId: string) => void;

  // Canvas load/save
  loadCanvas: (promotionId: string) => Promise<void>;
  saveCanvas: () => Promise<void>;

  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Reset
  reset: () => void;
}

const INITIAL_STATE = {
  promotionId: null as string | null,
  nodes: [] as Node[],
  edges: [] as Edge[],
  viewport: { x: 0, y: 0, zoom: 1 } as Viewport,
  selectedNodeId: null as string | null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null as string | null,
  history: [] as { nodes: Node[]; edges: Edge[] }[],
  historyIndex: -1,
};

export const usePromotionCanvasStore = create<CanvasState>((set, get) => ({
  ...INITIAL_STATE,

  setPromotionId: (id) => set({ promotionId: id }),

  setNodes: (nodes) => set({ nodes, isDirty: true }),

  setEdges: (edges) => set({ edges, isDirty: true }),

  setViewport: (viewport) => set({ viewport }),

  onNodesChange: (changes) => {
    const { nodes } = get();
    const updated = applyNodeChanges(changes, nodes);
    set({ nodes: updated, isDirty: true });
  },

  onEdgesChange: (changes) => {
    const { edges } = get();
    const updated = applyEdgeChanges(changes, edges);
    set({ edges: updated, isDirty: true });
  },

  onConnect: (connection) => {
    const { edges, pushHistory } = get();
    pushHistory();
    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'promotionEdge',
    };
    set({ edges: [...edges, newEdge], isDirty: true });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  addNode: (node) => {
    const { nodes, pushHistory } = get();
    pushHistory();
    set({ nodes: [...nodes, node], isDirty: true });
  },

  updateNodeData: (nodeId, data) => {
    const { nodes } = get();
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    });
  },

  removeNode: (nodeId) => {
    const { nodes, edges, pushHistory } = get();
    pushHistory();
    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      isDirty: true,
      selectedNodeId: null,
    });
  },

  loadCanvas: async (promotionId) => {
    try {
      const res = await fetch(`/api/promotions/canvas?promotionId=${promotionId}`);
      const data = await res.json();
      if (res.ok && data.canvas) {
        set({
          promotionId,
          nodes: data.canvas.nodes || [],
          edges: data.canvas.edges || [],
          viewport: data.canvas.viewport || { x: 0, y: 0, zoom: 1 },
          isDirty: false,
          lastSavedAt: data.canvas.updated_at,
          history: [{ nodes: data.canvas.nodes || [], edges: data.canvas.edges || [] }],
          historyIndex: 0,
        });
      } else {
        // New canvas — start with default nodes
        const defaultNodes = createDefaultNodes(promotionId);
        set({
          promotionId,
          nodes: defaultNodes.nodes,
          edges: defaultNodes.edges,
          viewport: { x: 0, y: 0, zoom: 1 },
          isDirty: true,
          history: [{ nodes: defaultNodes.nodes, edges: defaultNodes.edges }],
          historyIndex: 0,
        });
      }
    } catch {
      const defaultNodes = createDefaultNodes(promotionId);
      set({
        promotionId,
        nodes: defaultNodes.nodes,
        edges: defaultNodes.edges,
        viewport: { x: 0, y: 0, zoom: 1 },
        isDirty: true,
        history: [{ nodes: defaultNodes.nodes, edges: defaultNodes.edges }],
        historyIndex: 0,
      });
    }
  },

  saveCanvas: async () => {
    const { promotionId, nodes, edges, viewport, isSaving } = get();
    if (!promotionId || isSaving) return;

    set({ isSaving: true });
    try {
      const res = await fetch('/api/promotions/canvas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId, nodes, edges, viewport }),
      });
      if (res.ok) {
        set({ isDirty: false, lastSavedAt: new Date().toISOString() });
      }
    } catch {
      // silent
    }
    set({ isSaving: false });
  },

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    // Keep max 50 history entries
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      nodes: JSON.parse(JSON.stringify(prev.nodes)),
      edges: JSON.parse(JSON.stringify(prev.edges)),
      historyIndex: historyIndex - 1,
      isDirty: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      nodes: JSON.parse(JSON.stringify(next.nodes)),
      edges: JSON.parse(JSON.stringify(next.edges)),
      historyIndex: historyIndex + 1,
      isDirty: true,
    });
  },

  reset: () => set(INITIAL_STATE),
}));

function createDefaultNodes(promotionId: string) {
  const hubNode: Node = {
    id: `hub-${promotionId}`,
    type: 'promotionHub',
    position: { x: 400, y: 300 },
    data: { label: '프로모션 허브' },
  };
  const budgetNode: Node = {
    id: `budget-${Date.now()}`,
    type: 'budget',
    position: { x: 400, y: 600 },
    data: { totalBudget: 0, channelBudgets: [] },
  };
  const edge: Edge = {
    id: `e-hub-budget-${Date.now()}`,
    source: hubNode.id,
    target: budgetNode.id,
    type: 'promotionEdge',
  };
  return { nodes: [hubNode, budgetNode], edges: [edge] };
}
