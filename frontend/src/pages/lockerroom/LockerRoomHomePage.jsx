import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import useTeamStore from '../../store/useTeamStore';
import useAuthStore from '../../store/useAuthStore';
import apiRequest from '../../lib/apiRequest';
import { toastSuccess } from '../../utils/alert';
import PlayerStatHexagon from '../../components/stats/PlayerStatHexagon';
import './LockerRoomHomePage.scss';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n) => String(n).padStart(2, '0');

const todayStr = () => new Date().toISOString().slice(0, 10);

const LockerRoomHomePage = () => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const myInfo = useAuthStore((state) => state.myInfo);

  useEffect(() => {
    getTeamInfo();
  }, [getTeamInfo]);

  // 팀 관리자/운영자 여부 (투표 요청 권한)
  const canManage =
    ['admin', 'developer'].includes(myInfo?.role) ||
    ['leader', 'manager'].includes(teamInfo?.role);

  // ── 다음 경기 (현재 시각 기준 가장 가까운 예정 경기) ──
  const [nextGame, setNextGame] = useState(null);

  const loadNextGame = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const res = await apiRequest('get', '/team/match/next', { team_id: teamInfo.id });
      const d = res?.data;
      if (d) {
        const dt = new Date(d.match_date);
        setNextGame({
          id: d.id,
          dateLabel: `${dt.getMonth() + 1}/${dt.getDate()} (${DOW[dt.getDay()]})`,
          time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
          location: d.location,
          attendList: d.attend,
          absentList: d.absent,
          pendingList: d.pending,
        });
        setMyVote(d.mine === 'attend' || d.mine === 'absent' ? d.mine : null);
      } else {
        setNextGame(null);
      }
    } catch {
      setNextGame(null);
    }
  }, [teamInfo?.id]);

  useEffect(() => {
    loadNextGame();
  }, [loadNextGame]);

  // ── 대시보드 더미 데이터 (TODO: API 연동) ──
  const lastResult = { result: 'W', score: '62 : 58', opponent: '강남 불스' };
  const dues = { unpaid: true, month: 8 };
  const notice = { title: '이번 주 훈련 장소 변경 안내', date: '8/5' };
  // 내 능력치 (더미 — TODO: 로그인 유저의 실제 스탯 → 축별 0~10 환산)
  const myStats = [
    { axis: '득점', score: 7.5, raw: '22.0' },
    { axis: '3점', score: 6.3, raw: '38%' },
    { axis: '리바운드', score: 5.0, raw: '8.1' },
    { axis: '어시스트', score: 8.2, raw: '5.4' },
    { axis: '수비', score: 4.6, raw: '2.3' },
    { axis: '효율', score: 6.8, raw: 'TS 55%' },
  ];

  const [myVote, setMyVote] = useState(null); // 'attend' | 'absent' | null
  const [rosterOpen, setRosterOpen] = useState(false);

  const handleVote = async (status) => {
    if (!nextGame) return;
    setMyVote(status);
    try {
      await apiRequest('put', `/team/match/${nextGame.id}/attendance`, { status });
      loadNextGame();
    } catch {
      /* 실패해도 다음 로드에서 서버값으로 보정 */
    }
  };

  // 참석 투표 요청: 하루 1회 (TODO: 서버측 제한으로 이전)
  const remindKey = nextGame ? `voteRemind:${nextGame.id}:${todayStr()}` : null;
  const [remindedToday, setRemindedToday] = useState(() =>
    remindKey ? !!localStorage.getItem(remindKey) : false
  );
  const handleRemind = () => {
    if (!nextGame || remindedToday || nextGame.pendingList.length === 0) return;
    // TODO: 서버 호출 → 미정자에게만 푸시 발송(FCM/APNs) + 하루 1회 서버 검증
    localStorage.setItem(remindKey, '1');
    setRemindedToday(true);
    toastSuccess(`미정 ${nextGame.pendingList.length}명에게 참석 투표 요청을 보냈어요.`);
  };

  const a = nextGame?.attendList.length ?? 0;
  const b = nextGame?.absentList.length ?? 0;
  const p = nextGame?.pendingList.length ?? 0;
  const total = a + b + p || 1;

  // 팀 없음
  if (!teamInfo) {
    return (
      <div className="locker-room-page">
        <div className="container">
          <div className="lr-empty">
            <span className="lr-empty__emoji">🏀</span>
            <h2>아직 소속된 팀이 없어요</h2>
            <p>팀을 만들거나, 매치에서 게스트로 뛰며 팀을 찾아보세요.</p>
            <div className="lr-empty__actions">
              <Link to="/create-team" className="lr-btn primary">팀 만들기</Link>
              <Link to="/match-board" className="lr-btn ghost">매치 둘러보기</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="locker-room-page lr-dashboard">
      <div className="container">
        {/* 다음 경기 — 있으면 투표 카드, 없으면 빈 상태 */}
        {nextGame ? (
        <section className="next-game">
          <div className="ng-head">
            <span className="ng-tag">다음 경기</span>
            <span className="ng-dt">
              {nextGame.dateLabel} {nextGame.time}
            </span>
          </div>
          <div className="ng-loc">📍 {nextGame.location}</div>

          <div className="vote-bar">
            <span className="seg attend" style={{ width: `${(a / total) * 100}%` }} />
            <span className="seg absent" style={{ width: `${(b / total) * 100}%` }} />
          </div>

          <div className="vote-row">
            <span className="vote-counts">
              <span className="c attend">참석 {a}</span>
              <span className="c absent">불참 {b}</span>
              <span className="c pending">미정 {p}</span>
            </span>
            <button className="roster-toggle" onClick={() => setRosterOpen((v) => !v)}>
              명단 {rosterOpen ? '▲' : '▾'}
            </button>
          </div>

          <div className="vote-actions">
            <button
              className={`vote-btn attend ${myVote === 'attend' ? 'on' : ''}`}
              onClick={() => handleVote('attend')}
            >
              참석
            </button>
            <button
              className={`vote-btn absent ${myVote === 'absent' ? 'on' : ''}`}
              onClick={() => handleVote('absent')}
            >
              불참
            </button>
          </div>

          {rosterOpen && (
            <div className="vote-roster">
              <div className="rg">
                <span className="rg-label attend">참석 {a}</span>
                <span className="rg-names">{nextGame.attendList.join(', ') || '-'}</span>
              </div>
              <div className="rg">
                <span className="rg-label absent">불참 {b}</span>
                <span className="rg-names">{nextGame.absentList.join(', ') || '-'}</span>
              </div>
              <div className="rg pending">
                <div className="rg-top">
                  <span className="rg-label pending">미정 {p}</span>
                  {canManage && p > 0 && (
                    <button
                      className="remind-btn"
                      onClick={handleRemind}
                      disabled={remindedToday}
                    >
                      {remindedToday ? '오늘 요청 완료' : '🔔 투표 요청'}
                    </button>
                  )}
                </div>
                <span className="rg-names">{nextGame.pendingList.join(', ') || '-'}</span>
              </div>
              {canManage && (
                <p className="remind-hint">미정 인원에게만 발송 · 하루 1회</p>
              )}
            </div>
          )}
        </section>
        ) : (
          <section className="next-game next-game--empty">
            <span className="ng-tag">다음 경기</span>
            <p className="ng-empty-msg">📅 예정된 경기가 없어요</p>
            {canManage ? (
              <Link to="/locker-room/matches" className="ng-empty-cta">＋ 경기 만들기</Link>
            ) : (
              <p className="ng-empty-sub">일정이 등록되면 여기에서 참석 투표를 할 수 있어요</p>
            )}
          </section>
        )}

        {/* 내 능력치 (컴팩트 육각 그래프) */}
        <section className="my-stat">
          <div className="sec-head">
            <h3 className="sec-title">{teamInfo.name}</h3>
            <Link to="/locker-room/records" className="sec-more">자세히 →</Link>
          </div>
          <PlayerStatHexagon
            player={{ name: myInfo?.name, image: myInfo?.profile_image }}
            stats={myStats}
            compact
          />
        </section>

        {/* 상태 요약 */}
        <section className="lr-status">
          <Link to="/locker-room/records" className="stat-card result">
            <span className="sc-label">최근 경기</span>
            <span className={`sc-badge ${lastResult.result === 'W' ? 'win' : 'lose'}`}>
              {lastResult.result === 'W' ? '승' : '패'}
            </span>
            <span className="sc-main">{lastResult.score}</span>
            <span className="sc-sub">vs {lastResult.opponent}</span>
          </Link>

          <Link
            to="/locker-room/management/dues"
            className={`stat-card dues ${dues.unpaid ? 'warn' : ''}`}
          >
            <span className="sc-label">{dues.month}월 회비</span>
            <span className="sc-main">{dues.unpaid ? '미납' : '완납'}</span>
            <span className="sc-sub">눌러서 확인</span>
          </Link>

          <Link to="/locker-room/team-board" className="stat-card notice">
            <span className="sc-label">📢 팀 공지</span>
            <span className="sc-main notice-title">{notice.title}</span>
            <span className="sc-sub">{notice.date}</span>
          </Link>
        </section>
      </div>
    </div>
  );
};

export default LockerRoomHomePage;
