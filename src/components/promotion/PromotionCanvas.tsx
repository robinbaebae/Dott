'use client';

import { useCallback, useEffect, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import PromotionHubNode from './nodes/PromotionHubNode';
import ChannelNode from './nodes/ChannelNode';
import MessageNode from './nodes/MessageNode';
import AudienceNode from './nodes/AudienceNode';
import BudgetNode from './nodes/BudgetNode';
import TimelineNode from './nodes/TimelineNode';
import NoteNode from './nodes/NoteNode';
import PromotionEdge from './edges/PromotionEdge';
import PromotionToolbar from './PromotionToolbar';
import PromotionNodePalette from './PromotionNodePalette';
import PromotionDetailPanel from './PromotionDetailPanel';

const nodeTypes: NodeTypes = {
  promotionHub: PromotionHubNode,
  channel: ChannelNode,
  message: MessageNode,
  audience: AudienceNode,
  budget: BudgetNode,
  timeline: TimelineNode,
  note: NoteNode,
};

const edgeTypes: EdgeTypes = {
  promotionEdge: PromotionEdge,
};

interface Promotion {
  id: string;
  name: string;
  type: string;
  discount_value: string;
  target: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  goal: string;
  description: string;
  status: string;
}

interface PromotionCanvasProps {
  promotion: Promotion;
  onBack: () => void;
}

function CanvasInner({ promotion, onBack }: PromotionCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const store = usePromotionCanvasStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGeneratingAllRef = useRef(false);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    addNode,
    updateNodeData,
    loadCanvas,
    saveCanvas,
    pushHistory,
    undo,
    redo,
    isDirty,
    selectedNodeId,
  } = store;

  // Load canvas on mount
  useEffect(() => {
    loadCanvas(promotion.id).then(() => {
      // Sync hub node with promotion data
      const hubNode = usePromotionCanvasStore.getState().nodes.find((n) => n.type === 'promotionHub');
      if (hubNode) {
        updateNodeData(hubNode.id, {
          name: promotion.name,
          type: promotion.type,
          discountValue: promotion.discount_value,
          target: promotion.target,
          startDate: promotion.start_date || '',
          endDate: promotion.end_date || '',
          goal: promotion.goal,
          status: promotion.status,
        });
      }
      // Sync budget node
      const budgetNode = usePromotionCanvasStore.getState().nodes.find((n) => n.type === 'budget');
      if (budgetNode) {
        updateNodeData(budgetNode.id, { totalBudget: promotion.budget });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotion.id]);

  // Auto-save with 2s debounce
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCanvas();
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, nodes, edges, saveCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
          const node = usePromotionCanvasStore.getState().nodes.find((n) => n.id === selectedNodeId);
          if (node && node.type !== 'promotionHub') {
            store.removeNode(selectedNodeId);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedNodeId, store]);

  // AI copy generation event handler
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const { nodeId, channelType } = detail;
      updateNodeData(nodeId, { aiGenerating: true });
      try {
        const res = await fetch('/api/promotions/ai-channel-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promotionName: promotion.name,
            promotionType: promotion.type,
            discountValue: promotion.discount_value,
            target: promotion.target,
            goal: promotion.goal,
            channelType,
            usp: usePromotionCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.data.usp || '',
            ctaText: usePromotionCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.data.ctaText || '',
          }),
        });
        const data = await res.json();
        if (res.ok && data.copy) {
          updateNodeData(nodeId, { aiCopy: data.copy, aiGenerating: false });
        } else {
          updateNodeData(nodeId, { aiGenerating: false });
        }
      } catch {
        updateNodeData(nodeId, { aiGenerating: false });
      }
    };
    window.addEventListener('generate-channel-copy', handler);
    return () => window.removeEventListener('generate-channel-copy', handler);
  }, [promotion, updateNodeData]);

  // Drop handler for palette
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/promotion-node');
      if (!raw) return;

      const { type, channelType } = JSON.parse(raw);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: type === 'channel'
          ? { channelType, budgetAmount: 0, usp: '', ctaText: '', enabled: true }
          : type === 'message'
          ? { channelType: channelType || 'instagram', usp: '', ctaText: '', aiCopy: '' }
          : type === 'audience'
          ? { segmentName: '', description: '', tags: [] }
          : type === 'budget'
          ? { totalBudget: promotion.budget || 0 }
          : type === 'timeline'
          ? { phases: [] }
          : type === 'note'
          ? { text: '', colorKey: 'yellow' }
          : {},
      };

      pushHistory();
      addNode(newNode);

      // Auto-connect channel/audience to hub
      if (type === 'channel' || type === 'audience') {
        const hubNode = nodes.find((n) => n.type === 'promotionHub');
        if (hubNode) {
          const edge = {
            id: `e-${hubNode.id}-${newNode.id}-${Date.now()}`,
            source: hubNode.id,
            target: newNode.id,
            type: 'promotionEdge',
          };
          usePromotionCanvasStore.getState().setEdges([...usePromotionCanvasStore.getState().edges, edge]);
        }
      }
    },
    [screenToFlowPosition, addNode, pushHistory, nodes, promotion.budget]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Auto-layout
  const handleAutoLayout = useCallback(() => {
    const state = usePromotionCanvasStore.getState();
    pushHistory();
    const hubNode = state.nodes.find((n) => n.type === 'promotionHub');
    if (!hubNode) return;

    const hubX = 400;
    const hubY = 200;
    let channelX = hubX + 420;
    let channelY = 50;
    let otherX = hubX - 350;
    let otherY = 100;

    const updatedNodes = state.nodes.map((n) => {
      if (n.type === 'promotionHub') {
        return { ...n, position: { x: hubX, y: hubY } };
      }
      if (n.type === 'channel' || n.type === 'message') {
        const pos = { x: channelX, y: channelY };
        channelY += 220;
        return { ...n, position: pos };
      }
      if (n.type === 'budget') {
        return { ...n, position: { x: hubX, y: hubY + 300 } };
      }
      if (n.type === 'timeline') {
        return { ...n, position: { x: hubX - 50, y: hubY + 540 } };
      }
      const pos = { x: otherX, y: otherY };
      otherY += 200;
      return { ...n, position: pos };
    });

    usePromotionCanvasStore.getState().setNodes(updatedNodes);
  }, [pushHistory]);

  // Generate all channel copies
  const handleGenerateAll = useCallback(async () => {
    if (isGeneratingAllRef.current) return;
    isGeneratingAllRef.current = true;
    const channelNodes = usePromotionCanvasStore.getState().nodes.filter(
      (n) => n.type === 'channel' && n.data.enabled !== false
    );
    for (const cn of channelNodes) {
      window.dispatchEvent(new CustomEvent('generate-channel-copy', {
        detail: { nodeId: cn.id, channelType: cn.data.channelType },
      }));
      // Small delay between requests
      await new Promise((r) => setTimeout(r, 500));
    }
    isGeneratingAllRef.current = false;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PromotionToolbar
        promotionName={promotion.name}
        promotionStatus={promotion.status}
        onBack={onBack}
        onAutoLayout={handleAutoLayout}
        onGenerateAll={handleGenerateAll}
        isGeneratingAll={isGeneratingAllRef.current}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <PromotionNodePalette />
        <div className="flex-1 relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'promotionEdge' }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
            <MiniMap
              className="!bg-card !border !border-border !rounded-lg !shadow-lg"
              maskColor="rgba(0,0,0,0.1)"
              nodeColor={(node) => {
                if (node.type === 'promotionHub') return '#a855f7';
                if (node.type === 'channel') return '#ec4899';
                if (node.type === 'audience') return '#22c55e';
                if (node.type === 'budget') return '#f59e0b';
                if (node.type === 'timeline') return '#3b82f6';
                return '#888';
              }}
            />
            <Controls
              className="!bg-card !border !border-border !rounded-lg !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button]:hover:!bg-muted"
              showInteractive={false}
            />
          </ReactFlow>
        </div>
        {selectedNodeId && <PromotionDetailPanel />}
      </div>
    </div>
  );
}

export default function PromotionCanvas(props: PromotionCanvasProps) {
  return (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <CanvasInner {...props} />
      </div>
    </ReactFlowProvider>
  );
}
