'use client';

import { useState, useEffect } from 'react';
import { Influencer } from '@/types';
import { X } from 'lucide-react';

interface InfluencerFormProps {
  influencer?: Influencer | null;
  onSave: (data: Partial<Influencer>) => void;
  onClose: () => void;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'blog', label: '블로그' },
];

export default function InfluencerForm({ influencer, onSave, onClose }: InfluencerFormProps) {
  const [form, setForm] = useState({
    name: '',
    handle: '',
    platform: 'instagram',
    followers: 0,
    engagement_rate: 0,
    category: '',
    bio: '',
    email: '',
    phone: '',
    profile_image_url: '',
    price_range: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    if (influencer) {
      setForm({
        name: influencer.name,
        handle: influencer.handle ?? '',
        platform: influencer.platform,
        followers: influencer.followers,
        engagement_rate: influencer.engagement_rate,
        category: influencer.category ?? '',
        bio: influencer.bio ?? '',
        email: influencer.email ?? '',
        phone: influencer.phone ?? '',
        profile_image_url: influencer.profile_image_url ?? '',
        price_range: influencer.price_range ?? '',
        notes: influencer.notes ?? '',
        tags: (influencer.tags ?? []).join(', '),
      });
    }
  }, [influencer]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      handle: form.handle.trim() || null,
      platform: form.platform,
      followers: Number(form.followers),
      engagement_rate: Number(form.engagement_rate),
      category: form.category.trim() || null,
      bio: form.bio.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      profile_image_url: form.profile_image_url.trim() || null,
      price_range: form.price_range.trim() || null,
      notes: form.notes.trim() || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50';
  const labelClass = 'text-xs font-medium text-muted-foreground mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">
            {influencer ? '인플루언서 수정' : '인플루언서 추가'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted cursor-pointer">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Name (required) */}
          <div>
            <label className={labelClass}>이름 *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="인플루언서 이름"
            />
          </div>

          {/* Handle + Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>핸들</label>
              <input
                className={inputClass}
                value={form.handle}
                onChange={(e) => handleChange('handle', e.target.value)}
                placeholder="@handle"
              />
            </div>
            <div>
              <label className={labelClass}>플랫폼</label>
              <select
                className={inputClass}
                value={form.platform}
                onChange={(e) => handleChange('platform', e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Followers + Engagement */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>팔로워 수</label>
              <input
                type="number"
                className={inputClass}
                value={form.followers}
                onChange={(e) => handleChange('followers', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>참여율 (%)</label>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={form.engagement_rate}
                onChange={(e) => handleChange('engagement_rate', e.target.value)}
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>카테고리</label>
              <input
                className={inputClass}
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="뷰티, 패션, 테크..."
              />
            </div>
            <div>
              <label className={labelClass}>가격 범위</label>
              <input
                className={inputClass}
                value={form.price_range}
                onChange={(e) => handleChange('price_range', e.target.value)}
                placeholder="50~100만원"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className={labelClass}>소개</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="인플루언서 소개"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>이메일</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>전화번호</label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
          </div>

          {/* Profile image URL */}
          <div>
            <label className={labelClass}>프로필 이미지 URL</label>
            <input
              className={inputClass}
              value={form.profile_image_url}
              onChange={(e) => handleChange('profile_image_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>태그 (쉼표로 구분)</label>
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="뷰티, 리뷰, 협찬"
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>메모</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="참고 사항"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name.trim()}
            className="text-xs px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
          >
            {influencer ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
