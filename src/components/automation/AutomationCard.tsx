'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Automation, AutomationType } from '@/types';

const TYPE_LABELS: Record<AutomationType, string> = {
  content_generation: 'Content Generation',
  ad_report: 'Ad Report',
  brand_copy: 'Brand Copy',
};

const TYPE_COLORS: Record<AutomationType, string> = {
  content_generation: 'bg-purple-100 text-purple-800',
  ad_report: 'bg-orange-100 text-orange-800',
  brand_copy: 'bg-pink-100 text-pink-800',
};

interface AutomationCardProps {
  automation: Automation;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function AutomationCard({ automation, onDelete, onRefresh }: AutomationCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(automation.last_result || '');
  const [showInput, setShowInput] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setResult('');
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          id: automation.id,
          input: input || undefined,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        onRefresh();
      } else {
        setResult('Error: ' + (data.error || 'Execution failed'));
      }
    } catch {
      setResult('Error: Network error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{automation.name}</CardTitle>
            <Badge variant="secondary" className={TYPE_COLORS[automation.type]}>
              {TYPE_LABELS[automation.type]}
            </Badge>
          </div>
          <button
            onClick={() => onDelete(automation.id)}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Delete
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Prompt template</p>
          <p className="text-sm bg-muted p-2 rounded-md line-clamp-3">
            {automation.prompt_template}
          </p>
        </div>

        {showInput && (
          <Textarea
            placeholder="Additional input (optional)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
          />
        )}

        <div className="flex gap-2">
          <Button onClick={handleRun} disabled={isRunning} size="sm">
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInput(!showInput)}
          >
            {showInput ? 'Hide input' : 'Add input'}
          </Button>
        </div>

        {result && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Result</p>
            <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap max-h-64 overflow-auto">
              {result}
            </div>
            {automation.last_run_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Last run: {new Date(automation.last_run_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
