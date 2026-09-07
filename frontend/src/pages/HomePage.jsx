import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useTeamStore from '../store/useTeamStore';
import './HomePage.scss';

const HomePage = () => {
  const isLogin = useAuthStore((state) => state.isLogin);
  const myInfo = useAuthStore((state) => state.myInfo);
  const myTeams = useTeamStore((state) => state.myTeams);
  const getMyTeams = useTeamStore((state) => state.getMyTeams);

  // ── 내가 속한 팀 (활성 팀은 헤더 Select로 전환 = 서버의 기본 팀) ──
  useEffect(() => {
    if (isLogin && myTeams === null) getMyTeams();
  }, [isLogin, myTeams, getMyTeams]);
  const teams = myTeams || myInfo?.teams || [];
  const activeTeam = teams.find((t) => t.is_default === 1) || teams[0] || null;

  // ── 대시보드 더미 데이터 (TODO: API 연동) ──
  const nextGame = {
    dateLabel: '7/30 (수)',
    time: '20:00',
    location: '잠실학생체육관',
    attend: 8,
    absent: 2,
    pending: 3,
  };
  const [myVote, setMyVote] = useState(null); // 'attend' | 'absent' | null
  const lastResult = { result: 'W', score: '62 : 58', opponent: '강남 불스' };
  const dues = { unpaid: true, month: 7, amount: 50000 };
  const notice = { title: '이번 주 훈련 장소 변경 안내', date: '7/26' };
  const discovery = [
    { to: '/recruit', icon: '🙌', label: '팀원모집', count: 12 },
    { to: '/match-board', icon: '🏀', label: '경기모집', count: 7 },
    { to: '/court-board', icon: '📍', label: '코트대관', count: 5 },
  ];

  // ─────────────────────────────────────────────
  // 1) 비로그인: 에너지 히어로 + 로그인 유도
  // ─────────────────────────────────────────────
  // 홈은 로그인 필수(ProtectedRoute). 방어적으로 비로그인 시 렌더 안 함.
  if (!isLogin) return null;

  // ─────────────────────────────────────────────
  // 로그인 · 팀 없음: 활성화 (팀 만들기 / 찾기)
  // ─────────────────────────────────────────────
  if (teams.length === 0) {
    return (
      <div className="home-page home-dashboard">
        <div className="container">
          <p className="dash-greeting">{myInfo?.name || '선수'}님, 환영합니다 👋</p>
          <div className="no-team">
            <span className="no-team-emoji">🏀</span>
            <h2>아직 소속된 팀이 없어요</h2>
            <p>팀을 만들거나, 나에게 맞는 팀을 찾아보세요.</p>
            <div className="no-team-actions">
              <Link to="/create-team" className="nt-btn primary">팀 만들기</Link>
              <Link to="/recruit" className="nt-btn ghost">팀 찾기</Link>
            </div>
          </div>
          <HomeDiscovery discovery={discovery} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 3) 로그인 · 팀 있음: 대시보드
  // ─────────────────────────────────────────────
  const total = nextGame.attend + nextGame.absent + nextGame.pending;
  return (
    <div className="home-page home-dashboard">
      <div className="container">
        <p className="dash-greeting">{myInfo?.name || '선수'}님, 반가워요 👋</p>

        {/* 팀 전환은 상단 헤더의 Select로 통합 */}

        {/* 센터피스: 다음 경기 참석 투표 */}
        <section className="next-game">
          <div className="ng-top">
            <span className="ng-tag">다음 경기</span>
            {activeTeam && <span className="ng-team">{activeTeam.name}</span>}
          </div>
          <div className="ng-when">
            <span className="ng-date">{nextGame.dateLabel}</span>
            <span className="ng-time">{nextGame.time}</span>
          </div>
          <div className="ng-loc">📍 {nextGame.location}</div>

          <div className="ng-vote">
            <div className="vote-bar">
              <span className="seg attend" style={{ width: `${(nextGame.attend / total) * 100}%` }} />
              <span className="seg absent" style={{ width: `${(nextGame.absent / total) * 100}%` }} />
            </div>
            <div className="vote-counts">
              <span className="c attend">참석 {nextGame.attend}</span>
              <span className="c absent">불참 {nextGame.absent}</span>
              <span className="c pending">미정 {nextGame.pending}</span>
            </div>
            <div className="vote-actions">
              <button
                className={`vote-btn attend ${myVote === 'attend' ? 'on' : ''}`}
                onClick={() => setMyVote('attend')}
              >
                참석
              </button>
              <button
                className={`vote-btn absent ${myVote === 'absent' ? 'on' : ''}`}
                onClick={() => setMyVote('absent')}
              >
                불참
              </button>
            </div>
          </div>
        </section>

        {/* 상태 요약 */}
        <section className="status-grid">
          <Link to="/locker-room/records" className="stat-card result">
            <span className="sc-label">최근 경기</span>
            <span className={`sc-badge ${lastResult.result === 'W' ? 'win' : 'lose'}`}>
              {lastResult.result === 'W' ? '승' : '패'}
            </span>
            <span className="sc-main">{lastResult.score}</span>
            <span className="sc-sub">vs {lastResult.opponent}</span>
          </Link>

          <Link to="/locker-room/management/dues" className={`stat-card dues ${dues.unpaid ? 'warn' : ''}`}>
            <span className="sc-label">{dues.month}월 회비</span>
            <span className="sc-main">{dues.unpaid ? '미납' : '완납'}</span>
            <span className="sc-sub">{dues.amount.toLocaleString()}원</span>
          </Link>

          <Link to="/locker-room/team-board" className="stat-card notice">
            <span className="sc-label">📢 팀 공지</span>
            <span className="sc-main notice-title">{notice.title}</span>
            <span className="sc-sub">{notice.date}</span>
          </Link>
        </section>

        <HomeDiscovery discovery={discovery} />
      </div>
    </div>
  );
};

// 둘러보기 (모집/경기/코트 진입)
const HomeDiscovery = ({ discovery }) => (
  <section className="discovery">
    <h3 className="section-title">둘러보기</h3>
    <div className="discovery-grid">
      {discovery.map((d) => (
        <Link key={d.to} to={d.to} className="discovery-card">
          <span className="dc-icon">{d.icon}</span>
          <span className="dc-label">{d.label}</span>
          <span className="dc-count">{d.count}건 열림</span>
        </Link>
      ))}
    </div>
  </section>
);

export default HomePage;
