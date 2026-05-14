import { Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'
import './LandingPage.css'

// ── 피처 데이터 ──────────────────────────────────────────
const FEATURES = [
  {
    icon: '',
    title: '실시간 알레르기 감지',
    desc: 'AI가 급식 메뉴와 학생 알레르기 정보를 대조해 위험 식재료를 즉시 감지합니다.',
    color: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    icon: '',
    title: '맞춤 알림 서비스',
    desc: '급식 공개 전날 푸시·이메일로 알림을 발송해 미리 대비할 수 있도록 합니다.',
    color: '#FFF7ED',
    border: '#FED7AA',
  },
  {
    icon: '',
    title: 'AI 식단 자동 생성',
    desc: '영양소 목표·단가 제약을 반영한 맞춤 식단을 AI가 자동으로 초안을 만들어드립니다.',
    color: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    icon: '',
    title: '수요 집계 대시보드',
    desc: '학년별·알레르기 종류별 분포를 한눈에 파악해 영양사의 의사결정을 돕습니다.',
    color: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    icon: '',
    title: '대체 식단 관리',
    desc: '알레르기 학생을 위한 대체 메뉴를 끼니별로 관리하고 설문으로 최적안을 결정합니다.',
    color: '#FFF1F2',
    border: '#FECDD3',
  },
  {
    icon: '',
    title: '보호자 승인 시스템',
    desc: '학부모가 직접 자녀의 알레르기 정보를 확인하고 승인하는 투명한 프로세스를 제공합니다.',
    color: '#FFFBEB',
    border: '#FDE68A',
  },
]

const STEPS = [
  {
    num: '01',
    title: '소속 기관 등록',
    desc: '학교 코드로 소속 기관에 가입하고 역할을 선택합니다.',
  },
  {
    num: '02',
    title: '알레르기 정보 입력',
    desc: '학생·보호자가 19종 알레르기 항목 중 해당 항목을 선택하고 보호자가 최종 승인합니다.',
  },
  {
    num: '03',
    title: '자동 알림 & 안전 확인',
    desc: '영양사가 식단을 공개하면 위험 메뉴가 자동으로 감지되고, 개인별 알림이 발송됩니다.',
  },
]

// ── 메인 컴포넌트 ─────────────────────────────────────────
export function LandingPage() {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div
      style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", color: '#0F172A' }}
    >
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav
        className="landing-nav position-sticky top-0"
        style={{ zIndex: 1000, padding: '0 24px' }}
      >
        <div
          className="d-flex align-items-center justify-content-between"
          style={{ maxWidth: 1100, margin: '0 auto', height: 64 }}
        >
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.5px' }}>
              알라리알라 Aller Re-Alert
            </span>
          </div>
          <div className="d-flex gap-2">
            <Link
              to="/login"
              className="btn btn-sm"
              style={{
                border: '1.5px solid #CBD5E1',
                color: '#475569',
                borderRadius: 8,
                fontWeight: 600,
                padding: '6px 18px',
              }}
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                padding: '6px 18px',
              }}
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(145deg, #EFF6FF 0%, #EDE9FE 60%, #FCE7F3 100%)',
          padding: '80px 24px 100px',
          overflow: 'hidden',
        }}
      >
        <div
          className="d-flex align-items-center flex-wrap gap-5"
          style={{ maxWidth: 1100, margin: '0 auto' }}
        >
          {/* 텍스트 영역 */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>
            <div className="fade-up-1">
              <span
                style={{
                  display: 'inline-block',
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: 999,
                  padding: '4px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#2563EB',
                  marginBottom: 20,
                  letterSpacing: '0.3px',
                }}
              >
                학교 급식 알레르기 관리 솔루션
              </span>
            </div>

            <h1
              className="fade-up-2"
              style={{
                fontWeight: 900,
                fontSize: 'clamp(2rem, 5vw, 3.4rem)',
                lineHeight: 1.15,
                marginBottom: 20,
                letterSpacing: '-1px',
              }}
            >
              모든 아이의 급식을
              <br />
              <span className="gradient-text">안전하게</span>
            </h1>

            <p
              className="fade-up-3"
              style={{
                fontSize: '1.1rem',
                color: '#475569',
                lineHeight: 1.75,
                marginBottom: 32,
                maxWidth: 480,
              }}
            >
              알레르기 정보를 한 번만 등록하면, AI가 위험 메뉴를 실시간으로 감지하고 급식 전날 맞춤
              알림을 보내드립니다.
            </p>

            <div className="fade-up-4 d-flex gap-3 flex-wrap mb-5">
              <Link
                to="/signup"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
                }}
              >
                바로 시작하기
              </Link>
              <Link
                to="/login"
                className="btn"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                }}
              >
                로그인
              </Link>
            </div>

            {/* 통계 칩 */}
            <div className="fade-up-4 d-flex gap-2 flex-wrap">
              <span className="stat-chip"> 19종 알레르기 대응</span>
              <span className="stat-chip"> 실시간 알림</span>
              <span className="stat-chip"> AI 식단 생성</span>
            </div>
          </div>

          {/* 마스코트 */}
          <div
            style={{
              flex: '1 1 320px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <img
              src="/mascot.png"
              alt="알라리알라 마스코트"
              className="mascot-float"
              style={{
                width: 'min(380px, 100%)',
                height: 'auto',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="text-center mb-5">
            <span
              style={{
                display: 'inline-block',
                background: '#F5F3FF',
                borderRadius: 999,
                padding: '4px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#7C3AED',
                marginBottom: 12,
              }}
            >
              주요 기능
            </span>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                letterSpacing: '-0.5px',
              }}
            >
              급식 안전 관리의 <span className="gradient-text">모든 것</span>
            </h2>
            <p style={{ color: '#64748B', fontSize: '1rem', marginTop: 10 }}>
              학생·보호자·영양사·관리자가 함께 사용하는 통합 플랫폼
            </p>
          </div>

          <div className="row g-4">
            {FEATURES.map((f) => (
              <div className="col-12 col-md-6 col-lg-4" key={f.title}>
                <div
                  className="feature-card h-100 p-4 rounded-3"
                  style={{
                    background: f.color,
                    border: `1.5px solid ${f.border}`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
                  <h6 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>{f.title}</h6>
                  <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section style={{ background: '#F8FAFC', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="text-center mb-5">
            <span
              style={{
                display: 'inline-block',
                background: '#ECFDF5',
                borderRadius: 999,
                padding: '4px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#059669',
                marginBottom: 12,
              }}
            >
              사용 방법
            </span>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                letterSpacing: '-0.5px',
              }}
            >
              3단계로 <span className="gradient-text">바로 시작</span>
            </h2>
          </div>

          {/* 스텝 */}
          <div className="d-flex align-items-start flex-column flex-md-row gap-4 gap-md-0">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="d-flex flex-column align-items-center w-100 text-center"
                style={{ flex: 1 }}
              >
                <div className="d-flex align-items-center w-100">
                  {i > 0 ? (
                    <div className="step-connector d-none d-md-block" />
                  ) : (
                    <div className="d-none d-md-block" style={{ flex: 1 }} />
                  )}
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      flexShrink: 0,
                      boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                    }}
                  >
                    {step.num}
                  </div>
                  {i < STEPS.length - 1 ? (
                    <div className="step-connector d-none d-md-block" />
                  ) : (
                    <div className="d-none d-md-block" style={{ flex: 1 }} />
                  )}
                </div>
                <div className="mt-3">
                  <h6 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>
                    {step.title}
                  </h6>
                  <p
                    style={{
                      color: '#64748B',
                      fontSize: '0.85rem',
                      lineHeight: 1.7,
                      margin: '0 auto',
                      maxWidth: 200,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="cta-section" style={{ padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              color: '#fff',
              marginBottom: 14,
              letterSpacing: '-0.5px',
            }}
          >
            지금 바로 시작하세요
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '1rem',
              marginBottom: 32,
              lineHeight: 1.7,
            }}
          >
            무료로 가입하고 학교 급식 알레르기 관리를 혁신하세요.
          </p>
          <Link
            to="/signup"
            className="btn"
            style={{
              background: '#fff',
              color: '#2563EB',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '14px 36px',
              borderRadius: 10,
              border: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            지금 바로 시작하기 →
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer style={{ background: '#0F172A', color: '#94A3B8', padding: '40px 24px' }}>
        <div
          className="d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{ maxWidth: 1100, margin: '0 auto' }}
        >
          <div className="d-flex align-items-center gap-2">
            <img src="/favicon.svg" alt="logo" style={{ width: 22, height: 22, opacity: 0.7 }} />
            <span style={{ fontWeight: 700, color: '#E2E8F0', fontSize: '0.9rem' }}>
              알라리알라
            </span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            © 2025 AllerReAlert. 학교 급식 알레르기 관리 솔루션.
          </div>
          <div className="d-flex gap-4" style={{ fontSize: '0.82rem' }}>
            <Link to="/login" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              로그인
            </Link>
            <Link to="/signup" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              회원가입
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
