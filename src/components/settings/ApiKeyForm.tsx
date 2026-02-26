'use client';

import { useState, useEffect } from 'react';
import { Key, Check, AlertCircle, ExternalLink } from 'lucide-react';

export default function ApiKeyForm() {
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/api-key')
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '저장 실패' });
        return;
      }

      setHasKey(true);
      setMaskedKey('••••••••' + apiKey.trim().slice(-8));
      setApiKey('');
      setMessage({ type: 'success', text: 'API 키가 저장되었습니다' });
    } catch {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-2">
        <div
          className={`size-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-amber-500'}`}
        />
        <span className="text-sm text-muted-foreground">
          {hasKey ? `연결됨 (${maskedKey})` : 'API 키를 등록해 주세요'}
        </span>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Help */}
      <p className="text-xs text-muted-foreground">
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Anthropic Console에서 API 키 발급
          <ExternalLink className="size-3" />
        </a>
      </p>
    </div>
  );
}
