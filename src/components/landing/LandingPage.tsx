'use client';

import { useState, useRef, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import {
  MessageSquare, BarChart3, TrendingUp, FileText,
  Bookmark, PenTool, Megaphone, Zap, ArrowRight, Figma,
  CheckCircle2, Sparkles, ChevronDown, Monitor, Globe, Download,
  Shield, Terminal, LogIn,
} from 'lucide-react';

/* ─────────── scroll-reveal hook ─────────── */
type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'blur';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

const hiddenStyles: Record<RevealVariant, string> = {
  up: 'opacity-0 translate-y-12',
  left: 'opacity-0 -translate-x-10',
  right: 'opacity-0 translate-x-10',
  scale: 'opacity-0 scale-90',
  blur: 'opacity-0 blur-sm scale-95',
};

const visibleStyle = 'opacity-100 translate-y-0 translate-x-0 scale-100 blur-0';

function Section({
  children,
  className = '',
  delay = 0,
  variant = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-800 ease-out ${visible ? visibleStyle : hiddenStyles[variant]} ${className}`}
      style={{ transitionDelay: `${delay}ms`, transitionDuration: '800ms' }}
    >
      {children}
    </div>
  );
}

/* ─────────── data ─────────── */
const AGENTS = [
  { icon: Megaphone, label: '마케팅 전문가', desc: '카피라이팅, 캠페인 기획, SNS 전략, 이메일 시퀀스', color: '#C87DA0' },
  { icon: PenTool, label: '디자인 전문가', desc: '배너 제작, Figma 자동 Push, 크리에이티브 디렉션', color: '#9E7BAA' },
  { icon: TrendingUp, label: '리서치 전문가', desc: '트렌드 분석, 경쟁사 모니터링, SEO 키워드 리서치', color: '#D4A06B' },
  { icon: Zap, label: '서비스 빌더', desc: '기능 기획, 시스템 설계, 기술 전략 수립', color: '#E8A88E' },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI 대화',
    subtitle: '물어보기만 하세요. Dott이 알아서 판단합니다.',
    desc: '인스타 성과를 물으면 자동으로 데이터를 불러와 분석하고, 광고 카피를 요청하면 브랜드 톤에 맞춰 작성합니다.',
  },
  {
    icon: FileText,
    title: '콘텐츠 워크스페이스',
    subtitle: '기획부터 발행까지, 한 곳에서.',
    desc: '콘텐츠 작성, SEO 브리프, 이메일 시퀀스 빌더, 콘텐츠 캘린더까지 탭 하나로 전환합니다.',
  },
  {
    icon: BarChart3,
    title: '광고 분석',
    subtitle: '메타 광고 데이터, AI가 읽어줍니다.',
    desc: 'ROAS, 지출, 노출 등 핵심 지표를 시각화하고 AI가 인사이트를 제공합니다.',
  },
  {
    icon: TrendingUp,
    title: '트렌드 & 리서치',
    subtitle: '시장이 어디로 가는지, 경쟁사가 뭘 하는지.',
    desc: 'RSS 피드, 경쟁사 모니터링, 트렌드 요약을 자동으로 수집하고 분석합니다.',
  },
  {
    icon: Bookmark,
    title: '인사이트 & 메모',
    subtitle: '영감이 떠오를 때, 바로 저장.',
    desc: '링크, 아티클, 영상 스크랩과 메모를 저장하면 AI 대화에서 자동으로 참조합니다.',
  },
  {
    icon: Megaphone,
    title: '프로모션 빌더',
    subtitle: '캠페인을 뚝딱 만들어 보세요.',
    desc: '할인, 쿠폰, 번들 등 프로모션 유형 선택부터 타겟 설정, AI 카피 생성까지.',
  },
  {
    icon: Figma,
    title: 'Figma 자동 Push',
    subtitle: '배너 만들면, Figma에 바로 들어갑니다.',
    desc: 'AI가 생성한 배너를 Figma 플러그인이 자동으로 캔버스에 배치합니다. 디자인 툴 왔다갔다 할 필요 없이.',
  },
  {
    icon: Monitor,
    title: '플로팅 미니펫',
    subtitle: '데스크톱 위에 항상 떠 있는 AI 어시스턴트.',
    desc: 'macOS 전용 플로팅 앱으로 어디서든 Dott을 호출할 수 있습니다. 작업 중 바로 질문하고, 카피를 받고, 일정을 확인하세요. 앱을 전환할 필요 없이.',
    badge: 'macOS 전용',
  },
];

const COMPARISONS = [
  { label: '사용 툴', before: '5~10개 왔다갔다', after: '1개 앱에 전부' },
  { label: 'AI 활용', before: '범용 챗봇 (맥락 없음)', after: '브랜드를 학습한 전문 AI' },
  { label: '데이터 분석', before: '직접 엑셀 정리', after: '자동 수집 + AI 분석' },
  { label: '비용', before: '마케터 1명 월 300만원+', after: '월 구독료만' },
  { label: '컨텍스트', before: '매번 처음부터 설명', after: '히스토리 자동 참조' },
  { label: '디자인 전달', before: '이미지 저장 → Figma 수동 배치', after: 'AI 생성 → Figma 자동 Push' },
];

const STEPS = [
  { num: '01', title: '말하세요', desc: '자연어로 원하는 걸 말하면' },
  { num: '02', title: 'Dott이 판단합니다', desc: 'AI 오케스트레이터가 최적의 전문가를 자동 배정' },
  { num: '03', title: '결과를 받으세요', desc: '브랜드 맥락을 이해한 결과물이 나옵니다' },
];

/* ─────────── section backgrounds ─────────── */
const BG_HERO = `
  radial-gradient(ellipse 80% 65% at 3% 10%, rgba(170, 110, 220, 0.75) 0%, transparent 55%),
  radial-gradient(ellipse 65% 55% at 95% 5%, rgba(100, 110, 235, 0.65) 0%, transparent 50%),
  radial-gradient(ellipse 55% 50% at 50% 40%, rgba(230, 130, 195, 0.45) 0%, transparent 48%),
  radial-gradient(ellipse 50% 45% at 65% 25%, rgba(190, 155, 245, 0.5) 0%, transparent 42%),
  linear-gradient(180deg, #F5EFF3 0%, #EDE4EA 100%)
`;

const BG_PAIN = `
  radial-gradient(ellipse 70% 50% at 80% 30%, rgba(190, 155, 245, 0.4) 0%, transparent 50%),
  radial-gradient(ellipse 60% 50% at 20% 60%, rgba(230, 130, 195, 0.35) 0%, transparent 50%),
  linear-gradient(180deg, #E8DDE5 0%, #E0D5DE 100%)
`;

const BG_SOLUTION = `
  radial-gradient(ellipse 70% 55% at 15% 40%, rgba(155, 130, 168, 0.5) 0%, transparent 55%),
  radial-gradient(ellipse 60% 50% at 85% 50%, rgba(170, 110, 220, 0.4) 0%, transparent 50%),
  linear-gradient(180deg, #E0D5DE 0%, #C8B8D0 100%)
`;

const BG_HOWITWORKS = `
  radial-gradient(ellipse 65% 50% at 50% 30%, rgba(100, 110, 235, 0.3) 0%, transparent 50%),
  radial-gradient(ellipse 55% 45% at 75% 70%, rgba(190, 155, 245, 0.35) 0%, transparent 48%),
  linear-gradient(180deg, #C8B8D0 0%, #A898B8 100%)
`;

const BG_FEATURES = `
  radial-gradient(ellipse 70% 55% at 20% 35%, rgba(170, 110, 220, 0.35) 0%, transparent 50%),
  radial-gradient(ellipse 60% 50% at 80% 65%, rgba(100, 110, 235, 0.3) 0%, transparent 48%),
  radial-gradient(ellipse 50% 40% at 50% 50%, rgba(230, 130, 195, 0.25) 0%, transparent 45%),
  linear-gradient(180deg, #8B7AA0 0%, #7B6A90 100%)
`;

const BG_COMPARISON = `
  radial-gradient(ellipse 65% 50% at 70% 40%, rgba(190, 155, 245, 0.3) 0%, transparent 48%),
  radial-gradient(ellipse 55% 45% at 30% 60%, rgba(80, 200, 175, 0.2) 0%, transparent 45%),
  linear-gradient(180deg, #8B7AA0 0%, #6B5B80 100%)
`;

const BG_USECASES = `
  radial-gradient(ellipse 70% 55% at 50% 40%, rgba(100, 110, 235, 0.25) 0%, transparent 48%),
  radial-gradient(ellipse 55% 45% at 20% 70%, rgba(240, 130, 110, 0.2) 0%, transparent 45%),
  linear-gradient(180deg, #6B5B80 0%, #5B4D6E 100%)
`;

const BG_GUIDE = `
  radial-gradient(ellipse 65% 50% at 40% 40%, rgba(190, 155, 245, 0.3) 0%, transparent 48%),
  radial-gradient(ellipse 55% 45% at 70% 60%, rgba(230, 130, 195, 0.2) 0%, transparent 45%),
  linear-gradient(180deg, #EDE4EA 0%, #E8DDE5 100%)
`;

const BG_CTA = `
  radial-gradient(ellipse 80% 60% at 50% 40%, rgba(155, 130, 168, 0.35) 0%, transparent 55%),
  radial-gradient(ellipse 60% 50% at 20% 30%, rgba(170, 110, 220, 0.25) 0%, transparent 48%),
  radial-gradient(ellipse 50% 45% at 80% 70%, rgba(100, 110, 235, 0.2) 0%, transparent 45%),
  linear-gradient(180deg, #5B4D6E 0%, #3D3350 100%)
`;

/* ─────────── component ─────────── */
export default function LandingPage() {
  const [animating, setAnimating] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsElectron(true);
    }
  }, []);

  const handleGetStarted = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      signIn('google', { callbackUrl: '/' });
    }, 1300);
  };

  const handleDemo = () => {
    if (animating) return;
    setAnimating(true);
    sessionStorage.setItem('dott-demo', 'true');
    setTimeout(() => {
      window.location.reload();
    }, 1300);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">

      {/* ── Gradient circle expand on CTA ── */}
      {animating && (
        <div
          className="fixed rounded-full landing-circle-expand z-50"
          style={{
            background: `
              radial-gradient(circle at 30% 35%, rgba(170, 110, 220, 0.7) 0%, transparent 50%),
              radial-gradient(circle at 70% 25%, rgba(100, 110, 235, 0.6) 0%, transparent 45%),
              radial-gradient(circle at 55% 65%, rgba(230, 130, 195, 0.55) 0%, transparent 50%),
              radial-gradient(circle at 25% 70%, rgba(80, 200, 175, 0.5) 0%, transparent 45%),
              radial-gradient(circle at 75% 70%, rgba(240, 130, 110, 0.5) 0%, transparent 45%),
              radial-gradient(circle at 45% 45%, rgba(190, 155, 245, 0.6) 0%, transparent 55%),
              radial-gradient(circle, #F0EAEE 0%, #EDE4E9 100%)
            `,
          }}
        />
      )}

      {/* ═══════════════ NAV ═══════════════ */}
      <nav className="fixed top-0 inset-x-0 z-40">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 glass-card rounded-full px-5 py-2.5">
            <img src="/logo-dott.png" alt="Dott" className="w-8 h-8 rounded-lg" />
            <span className="text-base font-semibold text-[#5B4D6E]">Dott</span>
          </div>
          {isElectron ? (
            <button
              onClick={handleGetStarted}
              className="glass-card rounded-full px-6 py-2.5 text-sm font-medium text-[#5B4D6E] hover-lift cursor-pointer hover:elevation-2 transition-all"
            >
              시작하기
            </button>
          ) : (
            <a
              href="https://github.com/robinbaebae/Dott/releases/latest/download/Dott.dmg"
              className="glass-card rounded-full px-6 py-2.5 text-sm font-medium text-[#5B4D6E] hover-lift cursor-pointer hover:elevation-2 transition-all flex items-center gap-2"
            >
              <Download className="size-4" />
              앱 다운로드
            </a>
          )}
        </div>
      </nav>

      {/* ═══════════════ HERO — 밝은 배경 ═══════════════ */}
      <section
        className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 relative"
        style={{ background: BG_HERO }}
      >
        <Section variant="scale">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <img src="/logo-dott.png" alt="Dott" className="w-28 h-28 rounded-2xl mb-12" />

            <div className="inline-flex items-center gap-2 glass-card rounded-full px-5 py-2 mb-8">
              <Sparkles className="size-4 text-[#7B5B8B]" />
              <span className="text-sm font-medium text-[#7B5B8B]">AI 브랜드 비서</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#2D2D30] leading-[1.15] tracking-tight mb-8">
              마케팅,<br />
              <span className="text-[#7B5B8B]">혼자 다 하고 있잖아.</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#7E6E78] leading-relaxed max-w-xl mb-12">
              콘텐츠 기획, 광고 분석, 트렌드 리서치, 디자인까지.<br />
              Dott이 당신 옆에 앉은 4명의 전문가가 됩니다.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {isElectron ? (
                <button
                  onClick={handleGetStarted}
                  className="group flex items-center justify-center gap-2.5 px-10 py-4 rounded-full text-base font-semibold bg-[#5B4D6E] text-white hover:bg-[#6B5B7B] active:scale-[0.97] transition-all elevation-3 cursor-pointer"
                >
                  <LogIn className="size-5" />
                  Google로 시작하기
                  <ArrowRight className="size-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <>
                  <a
                    href="https://github.com/robinbaebae/Dott/releases/latest/download/Dott.dmg"
                    className="group flex items-center justify-center gap-2.5 px-10 py-4 rounded-full text-base font-semibold bg-[#5B4D6E] text-white hover:bg-[#6B5B7B] active:scale-[0.97] transition-all elevation-3 cursor-pointer"
                  >
                    <Monitor className="size-5" />
                    macOS 앱 다운로드
                    <Download className="size-4 group-hover:translate-y-0.5 transition-transform" />
                  </a>
                  <button
                    onClick={handleDemo}
                    className="group flex items-center justify-center gap-2.5 px-10 py-4 rounded-full text-base font-semibold bg-white/70 backdrop-blur-sm text-[#5B4D6E] border border-[#5B4D6E]/15 hover:bg-white/90 active:scale-[0.97] transition-all elevation-1 cursor-pointer"
                  >
                    <Globe className="size-5" />
                    데모 체험하기
                    <ArrowRight className="size-5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm text-[#8B82A0]">
              <span className="flex items-center gap-1.5">
                <Monitor className="size-3.5" /> macOS 데스크톱 앱
              </span>
              {!isElectron && (
                <span className="flex items-center gap-1.5">
                  <Globe className="size-3.5" /> 웹 데모
                </span>
              )}
            </div>
          </div>
        </Section>

        <div className="mt-20 animate-bounce">
          <ChevronDown className="size-6 text-[#8B82A0]" />
        </div>
      </section>

      {/* ═══════════════ SETUP GUIDE ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_GUIDE }}>
        <div className="max-w-4xl mx-auto">
          <Section variant="blur">
            <p className="text-sm font-medium text-[#7B5B8B] tracking-widest uppercase mb-4 text-center">Getting Started</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2D2235] text-center mb-5">
              시작하기 전에 준비할 것들
            </h2>
            <p className="text-base text-[#4A3D55] text-center max-w-xl mx-auto mb-6">
              Dott은 AI 엔진으로 <strong>Claude</strong>를 사용합니다.<br />
              아래 계정과 도구를 준비하면 모든 기능을 사용할 수 있습니다.
            </p>
          </Section>

          {/* 필요한 계정 요약 */}
          <Section delay={80} variant="up">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { icon: Globe, name: 'Google 계정', desc: '로그인 & 캘린더/Gmail 연동', free: true },
                { icon: Sparkles, name: 'Claude 계정', desc: 'AI 기능의 핵심 엔진', free: false },
                { icon: Terminal, name: 'Node.js', desc: 'Claude CLI 설치에 필요', free: true },
              ].map((item, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 text-center">
                  <div className="size-10 rounded-xl bg-[#7B5B8B]/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="size-5 text-[#7B5B8B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#2D2235] mb-1">{item.name}</p>
                  <p className="text-xs text-[#7E6E78]">{item.desc}</p>
                  <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${item.free ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.free ? '무료' : '유료 구독'}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Why Claude? */}
          <Section delay={120} variant="up">
            <div className="glass-card rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-[#7B5B8B]/10 flex items-center justify-center shrink-0">
                  <Sparkles className="size-5 text-[#7B5B8B]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#2D2235] mb-2">왜 Claude 계정이 필요한가요?</h3>
                  <p className="text-sm text-[#4A3D55] leading-relaxed">
                    Dott의 모든 AI 기능 — 대화, 콘텐츠 생성, 배너 제작, 트렌드 분석 — 은 Anthropic의 <strong>Claude AI</strong>가 구동합니다.
                    Claude CLI를 통해 사용자의 로컬 환경에서 직접 AI가 실행되므로, <strong>데이터가 외부 서버에 저장되지 않아</strong> 안전합니다.
                    Claude 계정이 있으면 월 사용량에 따라 AI를 이용할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Step by step */}
          <div className="space-y-5">
            <Section delay={160} variant="left">
              <div className="glass-card rounded-2xl p-7">
                <div className="flex items-start gap-5">
                  <div className="size-12 rounded-xl bg-[#7B5B8B]/10 flex items-center justify-center shrink-0">
                    <Download className="size-6 text-[#7B5B8B]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-[#7B5B8B]/50 bg-[#7B5B8B]/10 rounded-full px-2.5 py-0.5">STEP 1</span>
                      <h3 className="text-lg font-semibold text-[#2D2235]">macOS 앱 다운로드 & 설치</h3>
                    </div>
                    <p className="text-sm text-[#4A3D55] leading-relaxed mb-4">
                      상단의 <strong>macOS 앱 다운로드</strong> 버튼으로 <strong>Dott.dmg</strong> 파일을 받고, 열어서 Applications 폴더에 드래그하세요.
                    </p>
                    <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="size-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 mb-1">macOS 보안 경고가 뜨나요?</p>
                          <p className="text-sm text-amber-700/80 leading-relaxed">
                            처음 실행 시 <strong>&ldquo;확인되지 않은 개발자&rdquo;</strong> 경고가 나타날 수 있습니다.<br />
                            <strong>시스템 설정 → 개인정보 보호 및 보안</strong>으로 이동하여 하단의 <strong>&ldquo;확인 없이 열기&rdquo;</strong>를 클릭해주세요.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section delay={240} variant="left">
              <div className="glass-card rounded-2xl p-7">
                <div className="flex items-start gap-5">
                  <div className="size-12 rounded-xl bg-[#7B5B8B]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="size-6 text-[#7B5B8B]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-[#7B5B8B]/50 bg-[#7B5B8B]/10 rounded-full px-2.5 py-0.5">STEP 2</span>
                      <h3 className="text-lg font-semibold text-[#2D2235]">Claude 계정 생성 & CLI 설치</h3>
                    </div>
                    <p className="text-sm text-[#4A3D55] leading-relaxed mb-3">
                      Anthropic에서 Claude 계정을 만들고, 터미널에서 CLI를 설치합니다.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#7B5B8B]/40 bg-[#7B5B8B]/8 rounded-full size-6 flex items-center justify-center shrink-0">a</span>
                        <p className="text-sm text-[#4A3D55]">
                          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-[#7B5B8B] font-medium hover:underline">console.anthropic.com</a>에서 계정을 생성하세요.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#7B5B8B]/40 bg-[#7B5B8B]/8 rounded-full size-6 flex items-center justify-center shrink-0">b</span>
                        <p className="text-sm text-[#4A3D55]">터미널을 열고 아래 명령어를 실행하세요.</p>
                      </div>
                    </div>
                    <code className="block mt-3 px-4 py-3 rounded-xl bg-[#2D2235] text-sm font-mono text-[#E8DCE8] select-all">
                      npm install -g @anthropic-ai/claude-code
                    </code>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs font-bold text-[#7B5B8B]/40 bg-[#7B5B8B]/8 rounded-full size-6 flex items-center justify-center shrink-0">c</span>
                      <p className="text-sm text-[#4A3D55]">
                        터미널에서 <code className="px-1.5 py-0.5 rounded bg-[#7B5B8B]/10 text-[11px] font-mono text-[#5B4D6E]">claude</code> 을 입력하여 Claude 계정으로 로그인하세요.
                      </p>
                    </div>
                    <p className="text-xs text-[#7E6E78] mt-3">
                      Node.js가 설치되어 있어야 합니다. 없다면 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-[#7B5B8B] hover:underline">nodejs.org</a>에서 먼저 설치하세요.
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            <Section delay={320} variant="left">
              <div className="glass-card rounded-2xl p-7">
                <div className="flex items-start gap-5">
                  <div className="size-12 rounded-xl bg-[#7B5B8B]/10 flex items-center justify-center shrink-0">
                    <LogIn className="size-6 text-[#7B5B8B]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-[#7B5B8B]/50 bg-[#7B5B8B]/10 rounded-full px-2.5 py-0.5">STEP 3</span>
                      <h3 className="text-lg font-semibold text-[#2D2235]">Dott 실행 & Google 로그인</h3>
                    </div>
                    <p className="text-sm text-[#4A3D55] leading-relaxed">
                      Dott 앱을 실행하고 <strong>Google 계정</strong>으로 로그인하면 준비 완료!<br />
                      Google 캘린더와 Gmail도 자동으로 연동되어 일정 관리와 이메일 마케팅까지 가능합니다.
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </section>

      {/* ═══════════════ PAIN POINTS — 밝은 퍼플 ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_PAIN }}>
        <div className="max-w-5xl mx-auto">
          <Section variant="blur">
            <p className="text-sm font-medium text-[#7B5B8B] tracking-widest uppercase mb-4 text-center">Problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2D2D30] text-center mb-5">
              이거 다 당신 얘기 아닌가요?
            </h2>
            <p className="text-base text-[#7E6E78] text-center max-w-lg mx-auto mb-16">
              혼자서 마케팅의 모든 것을 감당하고 있다면, 당신만 그런 게 아닙니다.
            </p>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { emoji: '😵‍💫', text: '콘텐츠 쓰려고 ChatGPT, 일정은 노션, 광고는 메타 대시보드, 트렌드는 구글링...' },
              { emoji: '⏰', text: '매일 5개 이상의 툴을 왔다갔다 하면서 시간을 쏟고 있다' },
              { emoji: '💸', text: '마케터를 뽑고 싶지만 아직 그럴 여유가 없다' },
              { emoji: '📊', text: '데이터는 쌓이는데 분석할 시간이 없다' },
            ].map((item, i) => (
              <Section key={i} delay={i * 120} variant={i % 2 === 0 ? 'left' : 'right'}>
                <div className="glass-card rounded-2xl p-7 hover-lift cursor-default">
                  <span className="text-3xl mb-4 block">{item.emoji}</span>
                  <p className="text-base text-[#5a4a60] leading-relaxed">{item.text}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SOLUTION — 중간 퍼플 ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_SOLUTION }}>
        <div className="max-w-5xl mx-auto">
          <Section variant="blur">
            <p className="text-sm font-medium text-[#7B5B8B] tracking-widest uppercase mb-4 text-center">Solution</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2D2235] text-center mb-5">
              Dott은 <span className="text-[#5B4D6E]">AI 브랜드 비서</span>입니다
            </h2>
            <p className="text-base text-[#4A3D55] text-center max-w-xl mx-auto mb-16">
              마케팅에 필요한 모든 것을 macOS 앱 하나에.<br />
              AI가 당신의 브랜드를 학습하고, 4명의 전문가처럼 일합니다.
            </p>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {AGENTS.map((agent, i) => (
              <Section key={i} delay={i * 120} variant="scale">
                <div className="rounded-2xl p-7 hover-lift cursor-default h-full backdrop-blur-[16px] bg-white/20 border border-white/30 shadow-lg">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${agent.color}25` }}
                  >
                    <agent.icon className="size-6" style={{ color: agent.color }} />
                  </div>
                  <h3 className="text-base font-semibold text-[#2D2235] mb-2">{agent.label}</h3>
                  <p className="text-sm text-[#4A3D55] leading-relaxed">{agent.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS — 진해지는 퍼플 ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_HOWITWORKS }}>
        <div className="max-w-4xl mx-auto">
          <Section variant="up">
            <p className="text-sm font-medium text-[#E8DCE8] tracking-widest uppercase mb-4 text-center">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
              3단계로 끝나는 워크플로우
            </h2>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <Section key={i} delay={i * 180} variant="left">
                <div className="rounded-2xl p-8 text-center hover-lift cursor-default backdrop-blur-[16px] bg-white/15 border border-white/20 shadow-lg">
                  <span className="text-5xl font-bold text-white/20 block mb-4">{step.num}</span>
                  <h3 className="text-base font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-white/80 leading-relaxed">{step.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES — 딥 퍼플 ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_FEATURES }}>
        <div className="max-w-5xl mx-auto">
          <Section variant="blur">
            <p className="text-sm font-medium text-[#E8DCE8] tracking-widest uppercase mb-4 text-center">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-5">
              하나의 앱, 모든 마케팅
            </h2>
            <p className="text-base text-white/80 text-center max-w-xl mx-auto mb-16">
              각 기능이 유기적으로 연결되어, 데이터가 흐르고 AI가 맥락을 이해합니다.
            </p>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, i) => (
              <Section key={i} delay={i * 100} variant="scale">
                <div className="rounded-2xl p-7 hover-lift cursor-default h-full backdrop-blur-[16px] bg-white/10 border border-white/15 shadow-lg relative">
                  {'badge' in feat && feat.badge && (
                    <span className="absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-[#E8DCE8] border border-white/10">
                      {feat.badge as string}
                    </span>
                  )}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-white/10">
                    <feat.icon className="size-5 text-[#E8DCE8]" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5">{feat.title}</h3>
                  <p className="text-sm font-medium text-[#E8DCE8] mb-3">{feat.subtitle}</p>
                  <p className="text-sm text-white/75 leading-relaxed">{feat.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ COMPARISON — 어두운 퍼플 ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_COMPARISON }}>
        <div className="max-w-3xl mx-auto">
          <Section variant="up">
            <p className="text-sm font-medium text-[#E8DCE8] tracking-widest uppercase mb-4 text-center">Comparison</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
              왜 Dott인가요?
            </h2>
          </Section>

          <Section delay={100} variant="scale">
            <div className="rounded-2xl overflow-hidden backdrop-blur-[20px] bg-white/10 border border-white/15 shadow-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-5 text-sm font-semibold text-white/70"></th>
                    <th className="text-left px-6 py-5 text-sm font-semibold text-white/60">기존 방식</th>
                    <th className="text-left px-6 py-5 text-sm font-semibold text-[#E8DCE8]">Dott</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISONS.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-b-0">
                      <td className="px-6 py-4 text-sm font-medium text-white/90">{row.label}</td>
                      <td className="px-6 py-4 text-sm text-white/60">{row.before}</td>
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-[#E8DCE8]" />
                          {row.after}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </section>

      {/* ═══════════════ USE CASES — 다크 퍼플 ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_USECASES }}>
        <div className="max-w-4xl mx-auto">
          <Section variant="blur">
            <p className="text-sm font-medium text-[#E8DCE8] tracking-widest uppercase mb-4 text-center">Use cases</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
              이런 분들이 쓰고 있어요
            </h2>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { role: '1인 쇼핑몰 운영자', quote: '상품 설명, 인스타 카피, 광고 세팅까지 Dott 하나로 끝납니다.' },
              { role: '스타트업 마케터', quote: '5개 툴 구독료 아끼고, 리서치 시간 70% 줄었어요.' },
              { role: '프리랜서 마케터', quote: '클라이언트마다 브랜드 톤이 다른데, Dott이 다 기억해줘요.' },
            ].map((item, i) => (
              <Section key={i} delay={i * 150} variant="right">
                <div className="rounded-2xl p-7 hover-lift cursor-default h-full backdrop-blur-[16px] bg-white/8 border border-white/12 shadow-lg">
                  <p className="text-sm font-semibold text-[#E8DCE8] mb-4">{item.role}</p>
                  <p className="text-base text-white/85 leading-relaxed italic">&ldquo;{item.quote}&rdquo;</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TECH + FINAL CTA — 가장 어두운 퍼플 ═══════════════ */}
      <section className="py-28 px-6 relative" style={{ background: BG_CTA }}>
        <div className="max-w-3xl mx-auto text-center mb-20">
          <Section variant="up">
            <p className="text-sm text-white/50 mb-3">Available on</p>
            <div className="flex items-center justify-center gap-8 mb-8">
              <span className="flex items-center gap-2 text-base font-medium text-white">
                <Monitor className="size-5" /> macOS 데스크톱
              </span>
              {!isElectron && (
                <span className="flex items-center gap-2 text-base font-medium text-white/50">
                  <Globe className="size-5" /> 웹 데모
                </span>
              )}
            </div>
            <p className="text-sm text-white/50 mb-6">Built with</p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              {['Claude AI', 'Electron', 'Next.js', 'Supabase'].map((tech) => (
                <span key={tech} className="text-base font-medium text-white/45">{tech}</span>
              ))}
            </div>
          </Section>
        </div>

        <div className="max-w-2xl mx-auto text-center">
          <Section variant="scale">
            <div className="rounded-3xl p-14 backdrop-blur-[24px] bg-white/8 border border-white/12 shadow-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
                마케팅팀이 필요한 순간,<br />
                <span className="text-[#E8DCE8]">Dott을 열어보세요.</span>
              </h2>
              <p className="text-base text-white/75 mb-10 leading-relaxed">
                더 이상 여러 툴을 오가지 마세요.<br />
                당신의 브랜드를 이해하는 AI가 기다리고 있습니다.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isElectron ? (
                  <button
                    onClick={handleGetStarted}
                    className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-full text-base font-semibold bg-white text-[#5B4D6E] hover:bg-white/90 active:scale-[0.97] transition-all shadow-lg cursor-pointer"
                  >
                    <LogIn className="size-5" />
                    Google로 시작하기
                    <ArrowRight className="size-5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <>
                    <a
                      href="https://github.com/robinbaebae/Dott/releases/latest/download/Dott.dmg"
                      className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-full text-base font-semibold bg-white text-[#5B4D6E] hover:bg-white/90 active:scale-[0.97] transition-all shadow-lg cursor-pointer"
                    >
                      <Monitor className="size-5" />
                      macOS 앱 다운로드
                      <Download className="size-4 group-hover:translate-y-0.5 transition-transform" />
                    </a>
                    <button
                      onClick={handleDemo}
                      className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-full text-base font-semibold bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/15 active:scale-[0.97] transition-all cursor-pointer"
                    >
                      <Globe className="size-5" />
                      데모 체험하기
                      <ArrowRight className="size-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}
              </div>
              <p className="mt-5 text-sm text-white/50">macOS 데스크톱 전용 · 설치 후 바로 사용 가능</p>
            </div>
          </Section>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="py-12 px-6 border-t border-white/8" style={{ background: '#332B42' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo-dott.png" alt="Dott" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-medium text-white/70">Dott</span>
          </div>
          <p className="text-sm text-white/45">Built by Bae</p>
        </div>
      </footer>
    </div>
  );
}
