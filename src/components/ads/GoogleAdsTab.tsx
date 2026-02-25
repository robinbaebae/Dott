'use client';

import { useState } from 'react';
import DataImporter, { type ParsedCampaign } from './DataImporter';
import ParsedDataView from './ParsedDataView';
import AiAnalysisPanel from './AiAnalysisPanel';

export default function GoogleAdsTab() {
  const [parsedData, setParsedData] = useState<ParsedCampaign[] | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DataImporter
        platform="google"
        onParsed={(campaigns) => setParsedData(campaigns)}
        onClear={() => setParsedData(null)}
      />

      {parsedData && parsedData.length > 0 ? (
        <>
          <ParsedDataView campaigns={parsedData} />
          <AiAnalysisPanel campaigns={parsedData} platform="google" />
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Google Ads 대시보드에서 내보낸 데이터를 붙여넣으면 자동으로 차트와 분석을 생성합니다.
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            Google Ads &rarr; 캠페인 &rarr; 보고서 &rarr; 다운로드 (CSV)
          </p>
        </div>
      )}
    </div>
  );
}
