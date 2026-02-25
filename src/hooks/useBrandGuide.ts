'use client';

import { useState, useEffect } from 'react';

export function useBrandGuide() {
  const [hasBrandGuide, setHasBrandGuide] = useState(false);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brand-guide')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.brand_name) {
          setHasBrandGuide(true);
          setBrandName(data.brand_name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { hasBrandGuide, brandName, loading };
}
