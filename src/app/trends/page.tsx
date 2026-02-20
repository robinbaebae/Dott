import SnsRecommendation from '@/components/trends/SnsRecommendation';
import TrendList from '@/components/trends/TrendList';

export default function TrendsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">트렌드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          뷰티 &amp; 패션 트렌드 기사를 실시간으로 모니터링합니다
        </p>
      </div>
      <SnsRecommendation />
      <TrendList />
    </div>
  );
}
