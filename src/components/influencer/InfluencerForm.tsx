'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Influencer } from '@/types';

interface Props {
  influencer: Influencer | null;
  onSave: (data: Partial<Influencer>) => void;
  onClose: () => void;
}

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'blog'];
const CATEGORIES = ['뷰티', '패션', '푸드', '여행', '테크', '라이프스타일', '피트니스', '육아', '게임', '교육'];

export default function InfluencerForm({ influencer, onSave, onClose }: Props) {
  const [name, setName] = useState(influencer?.name || '');
  const [handle, setHandle] = useState(influencer?.handle || '');
  const [platform, setPlatform] = useState(influencer?.platform || 'instagram');
  const [followers, setFollowers] = useState(influencer?.followers?.toString() || '');
  const [engagementRate, setEngagementRate] = useState(influencer?.engagement_rate?.toString() || '');
  const [category, setCategory] = useState(influencer?.category || '');
  const [bio, setBio] = useState(influencer?.bio || '');
  const [email, setEmail] = useState(influencer?.email || '');
  const [phone, setPhone] = useState(influencer?.phone || '');
  const [avgLikes, setAvgLikes] = useState(influencer?.avg_likes?.toString() || '');
  const [avgComments, setAvgComments] = useState(influencer?.avg_comments?.toString() || '');
  const [priceRange, setPriceRange] = useState(influencer?.price_range || '');
  const [notes, setNotes] = useState(influencer?.notes || '');
  const [tags, setTags] = useState(influencer?.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !handle.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        handle: handle.trim(),
        platform,
        followers: parseInt(followers) || 0,
        engagement_rate: parseFloat(engagementRate) || 0,
        category: category || null,
        bio: bio || null,
        email: email || null,
        phone: phone || null,
        avg_likes: parseInt(avgLikes) || 0,
        avg_comments: parseInt(avgComments) || 0,
        price_range: priceRange || null,
        notes: notes || null,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent/30';
  const labelClass = 'text-[11px] font-medium text-muted-foreground mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-sm font-semibold">{influencer ? '인플루언서 수정' : '인플루언서 추가'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Required fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>이름 *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="인플루언서 이름" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>핸들 *</label>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className={inputClass} />
            </div>
          </div>

          {/* Platform & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>플랫폼</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">선택 안함</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>팔로워 수</label>
              <input value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="0" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>참여율 (%)</label>
              <input value={engagementRate} onChange={(e) => setEngagementRate(e.target.value)} placeholder="0.0" type="number" step="0.1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>평균 좋아요</label>
              <input value={avgLikes} onChange={(e) => setAvgLikes(e.target.value)} placeholder="0" type="number" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>평균 댓글</label>
              <input value={avgComments} onChange={(e) => setAvgComments(e.target.value)} placeholder="0" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>단가 범위</label>
              <input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="예: 50-100만원" className={inputClass} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>이메일</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>전화번호</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className={inputClass} />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className={labelClass}>소개</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="인플루언서 소개" rows={2} className={inputClass + ' resize-none'} />
          </div>

          {/* Tags & Notes */}
          <div>
            <label className={labelClass}>태그 (쉼표 구분)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="뷰티, 리뷰, 브이로그" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>메모</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="추가 메모" rows={2} className={inputClass + ' resize-none'} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t sticky bottom-0 bg-background">
          <button onClick={onClose} className="text-[12px] px-4 py-2 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !handle.trim()}
            className="text-[12px] px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {saving ? '저장 중...' : influencer ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
