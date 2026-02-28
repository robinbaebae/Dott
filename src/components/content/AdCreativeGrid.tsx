'use client';

import { Badge } from '@/components/ui/badge';

interface Creative {
  banner_id: string;
  size: string;
  copy: string;
}

interface AdCopy {
  creative_index: number;
  headline: string;
  primary_text: string;
  description: string;
  cta: string;
}

interface Props {
  creatives: Creative[];
  adCopies?: AdCopy[];
}

const SIZE_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '1080x1080': { w: 120, h: 120 },
  '1200x628': { w: 150, h: 78 },
  '1080x1920': { w: 68, h: 120 },
  '300x250': { w: 120, h: 100 },
  '728x90': { w: 180, h: 22 },
};

export default function AdCreativeGrid({ creatives, adCopies }: Props) {
  if (!creatives.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {creatives.map((c, i) => {
        const copy = adCopies?.find((ac) => ac.creative_index === i);
        const dim = SIZE_DIMENSIONS[c.size] || { w: 120, h: 80 };

        return (
          <div key={c.banner_id} className="border rounded-lg p-3 space-y-2">
            {/* Size placeholder */}
            <div
              className="bg-muted/60 rounded flex items-center justify-center mx-auto"
              style={{ width: dim.w, height: dim.h }}
            >
              <span className="text-[10px] text-muted-foreground">{c.size}</span>
            </div>

            {/* Copy */}
            <p className="text-xs text-muted-foreground line-clamp-2">{c.copy}</p>

            {/* Ad copy if available */}
            {copy && (
              <div className="space-y-1 pt-1 border-t">
                <p className="text-[11px] font-medium truncate">{copy.headline}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{copy.primary_text}</p>
                <Badge variant="outline" className="text-[9px]">{copy.cta}</Badge>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
