import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toastError } from '../../utils/alert';
import './LiveSetupPage.scss';

const SQUAD_LABELS = ['A', 'B', 'C', 'D'];
const avatar = (name, url) =>
  url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=ff5a1f&color=fff&size=128`;

const LiveSetupPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const language = useLanguageStore((s) => s.language);
  const t = (kr, en) => (language === 'KR' ? kr : en);

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const [starting, setStarting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const didAutoRef = useRef(false);

  // 참가자 배치 상태
  const [pool, setPool] = useState([]); // 미배정 참가자 [{uid,userId,name,image,isGuest}]
  const [teams, setTeams] = useState([
    { label: 'A', members: [] },
    { label: 'B', members: [] },
  ]);
  const [guestSeq, setGuestSeq] = useState(0);

  // 드래그 상태
  const [drag, setDrag] = useState(null); // {uid, x, y, moved, name}
  const [hoverZone, setHoverZone] = useState(null);
  const [selectedUid, setSelectedUid] = useState(null); // 탭 폴백 선택

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiRequest('get', `/team/match/${matchId}`);
        const d = res?.data;
        setMatch(d);
        if (!d) return;

        const attend = d.attendance.list.filter((a) => a.status === 'attend');
        const src = attend.length > 0 ? attend : d.attendance.list;
        const attendees = src.map((a) => ({
          uid: `u${a.user_id}`, userId: a.user_id, name: a.name, image: a.image_url, isGuest: false,
        }));

        // 기존 스쿼드 구성이 있으면 DB(경기 상세) 기준으로 복원 (Redis 드래프트 의존 X)
        const existing = (d.squads || []).filter((s) => (s.members || []).length > 0);
        if (existing.length) {
          const assigned = new Set();
          let gseq = 0;
          const nextTeams = d.squads.map((s) => ({
            label: s.label,
            members: (s.members || []).map((m) => {
              if (m.user_id != null) {
                assigned.add(m.user_id);
                return { uid: `u${m.user_id}`, userId: m.user_id, name: m.name, image: m.image_url, isGuest: false };
              }
              gseq += 1;
              return { uid: `g${gseq}`, userId: null, name: m.name, image: null, isGuest: true };
            }),
          }));
          setTeams(nextTeams);
          setPool(attendees.filter((a) => !assigned.has(a.userId)));
          setGuestSeq(gseq);
          didAutoRef.current = true; // 기존 구성 유지 → 자동추천 스킵
        } else {
          setPool(attendees);
        }
      } catch {
        setMatch(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  // ── 참가자 이동/조회 헬퍼 ──
  const findParticipant = (uid) => {
    if (!uid) return null;
    const inPool = pool.find((p) => p.uid === uid);
    if (inPool) return inPool;
    for (const tm of teams) {
      const f = tm.members.find((p) => p.uid === uid);
      if (f) return f;
    }
    return null;
  };

  const moveTo = (uid, dest) => {
    const p = findParticipant(uid);
    if (!p) return;
    setPool((prev) => prev.filter((x) => x.uid !== uid));
    setTeams((prev) => prev.map((tm) => ({ ...tm, members: tm.members.filter((x) => x.uid !== uid) })));
    if (dest === 'pool') {
      setPool((prev) => [...prev, p]);
    } else {
      setTeams((prev) => prev.map((tm, i) => (i === dest ? { ...tm, members: [...tm.members, p] } : tm)));
    }
  };

  // 남은 참석자(풀)를 특정 팀에 전부 담기
  const moveAllPoolTo = (idx) => {
    if (!pool.length) return;
    setTeams((prev) => prev.map((tm, i) => (i === idx ? { ...tm, members: [...tm.members, ...pool] } : tm)));
    setPool([]);
    setSelectedUid(null);
  };

  // 남은 참석자를 인원이 적은 팀부터 균등 분배
  const distributeEvenly = () => {
    if (!pool.length) return;
    setTeams((prev) => {
      const next = prev.map((tm) => ({ ...tm, members: [...tm.members] }));
      for (const p of pool) {
        let min = next[0];
        for (const tm of next) if (tm.members.length < min.members.length) min = tm;
        min.members.push(p);
      }
      return next;
    });
    setPool([]);
    setSelectedUid(null);
  };

  // 팀 자동 추천 (실력·포지션·최근 2주 같은 팀 고려) — 참석자를 팀에 배분, 게스트는 풀로
  const applySuggestion = async (cnt) => {
    const count = cnt || teams.length;
    setSuggesting(true);
    try {
      const res = await apiRequest('get', `/team/match/${matchId}/suggest-teams`, { count });
      const sq = res?.data?.squads || [];
      if (!sq.length) {
        toastError(t('추천할 참석자가 없습니다.', 'No attendees to suggest.'));
        return;
      }
      const guests = [
        ...pool.filter((p) => p.isGuest),
        ...teams.flatMap((tm) => tm.members.filter((m) => m.isGuest)),
      ];
      setTeams(
        sq.map((s, i) => ({
          label: s.label || SQUAD_LABELS[i] || `${i + 1}`,
          members: s.members.map((m) => ({
            uid: `u${m.userId}`, userId: m.userId, name: m.name, image: m.image, isGuest: false,
          })),
        }))
      );
      setPool(guests); // 참석자는 모두 팀 배정, 게스트만 풀에 남겨 수동 배치
      setSelectedUid(null);
    } catch {
      toastError(t('팀 추천에 실패했습니다.', 'Failed to suggest teams.'));
    } finally {
      setSuggesting(false);
    }
  };

  // 첫 진입(예정 경기, 배정 전) 자동 추천
  useEffect(() => {
    if (didAutoRef.current || loading || !match) return;
    if (match.status === 'live') { didAutoRef.current = true; return; } // 기존 구성 유지
    if (pool.length === 0) return;
    if (!teams.every((tm) => tm.members.length === 0)) { didAutoRef.current = true; return; }
    didAutoRef.current = true;
    applySuggestion(teams.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, match, pool]);

  const setSquadCount = (n) => {
    setTeams((prev) => {
      let next = [...prev];
      while (next.length < n) next.push({ label: SQUAD_LABELS[next.length] || `${next.length + 1}`, members: [] });
      if (next.length > n) {
        const removed = next.slice(n);
        next = next.slice(0, n);
        const back = removed.flatMap((tm) => tm.members);
        if (back.length) setPool((p) => [...p, ...back]);
      }
      return next;
    });
  };

  const setTeamLabel = (idx, label) =>
    setTeams((prev) => prev.map((tm, i) => (i === idx ? { ...tm, label } : tm)));

  const addGuest = () => {
    const seq = guestSeq + 1;
    setGuestSeq(seq);
    setPool((prev) => [...prev, { uid: `g${seq}`, userId: null, name: `게스트${seq}`, image: null, isGuest: true }]);
  };

  const renameParticipant = (uid, name) => {
    setPool((prev) => prev.map((p) => (p.uid === uid ? { ...p, name } : p)));
    setTeams((prev) => prev.map((tm) => ({ ...tm, members: tm.members.map((p) => (p.uid === uid ? { ...p, name } : p)) })));
  };

  // ── 커스텀 포인터 드래그 (터치+마우스) ──
  const startDrag = (e, uid, name) => {
    // 이름 입력창(게스트) 조작은 드래그 시작 안 함
    if (e.target.tagName === 'INPUT') return;
    setDrag({ uid, x: e.clientX, y: e.clientY, moved: false, name });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const zoneEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-zone]');
      setHoverZone(zoneEl ? zoneEl.getAttribute('data-zone') : null);
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6 } : d));
    };
    const up = (e) => {
      const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-zone]')?.getAttribute('data-zone');
      setDrag((d) => {
        if (d) {
          if (d.moved && zone != null) {
            moveTo(d.uid, zone === 'pool' ? 'pool' : parseInt(zone));
          } else if (!d.moved) {
            // 탭: 선택 토글
            setSelectedUid((s) => (s === d.uid ? null : d.uid));
          }
        }
        return null;
      });
      setHoverZone(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, pool, teams]);

  // 탭 폴백: 존을 탭하면 선택된 참가자를 이동
  const zoneTap = (dest) => {
    if (selectedUid) {
      moveTo(selectedUid, dest);
      setSelectedUid(null);
    }
  };

  const handleStart = async () => {
    const filled = teams.filter((tm) => tm.members.length > 0);
    if (filled.length < 2) {
      toastError(t('최소 2개 팀에 선수를 배정해주세요.', 'Assign players to at least 2 teams.'));
      return;
    }
    setStarting(true);
    try {
      await apiRequest('post', `/team/live/${matchId}/start`, {
        squads: teams.map((tm, i) => ({
          label: tm.label?.trim() || SQUAD_LABELS[i] || `${i + 1}`,
          members: tm.members.map((p) => (p.isGuest ? { guestName: p.name } : { userId: p.userId })),
        })),
      });
      // 라이브 편집이면 경기 상세로, 예정→시작이면 기록 화면으로
      navigate(
        match.status === 'live'
          ? `/locker-room/matches/${matchId}`
          : `/locker-room/matches/${matchId}/live`
      );
    } catch {
      toastError(t('라이브 기록 시작에 실패했습니다.', 'Failed to start live tracking.'));
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="live-setup-page">
        <div className="container"><LoadingSpinner /></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="live-setup-page">
        <div className="container">
          <div className="ls-notfound">
            <p>{t('경기를 찾을 수 없습니다.', 'Match not found.')}</p>
            <button onClick={() => navigate('/locker-room/matches')}>{t('경기 목록', 'Matches')}</button>
          </div>
        </div>
      </div>
    );
  }

  const Chip = ({ p, inZone }) => (
    <div
      className={`chip ${p.isGuest ? 'guest' : ''} ${selectedUid === p.uid ? 'selected' : ''} ${drag?.uid === p.uid && drag?.moved ? 'dragging' : ''}`}
      onPointerDown={(e) => startDrag(e, p.uid, p.name)}
    >
      <img src={avatar(p.name, p.image)} alt={p.name} draggable={false} />
      {p.isGuest && inZone === 'pool' ? (
        <input
          className="chip-name-input"
          value={p.name}
          onChange={(e) => renameParticipant(p.uid, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          maxLength={16}
        />
      ) : (
        <span className="chip-name">{p.name}</span>
      )}
    </div>
  );

  return (
    <div className="live-setup-page">
      <div className="container">
        <div className="ls-head">
          <h1 className="page-title">{t('팀 구성', 'Build Teams')}</h1>
          <button className="btn-ghost" onClick={() => navigate(`/locker-room/matches/${matchId}`)}>
            {t('경기로', 'To Match')}
          </button>
        </div>

        <p className="ls-desc">
          {t('참석자를 끌어다 팀에 배치하세요. 인원이 모자라면 게스트를 추가할 수 있어요.', 'Drag attendees into teams. Add guests if short on players.')}
        </p>

        {/* 옵션 */}
        <div className="setup-card">
          <div className="field">
            <span>{t('파전 수', 'Teams')}</span>
            <div className="seg-control">
              {[2, 3, 4].map((n) => (
                <button key={n} className={teams.length === n ? 'on' : ''} onClick={() => setSquadCount(n)}>
                  {n}{t('파전', '-way')}
                </button>
              ))}
            </div>
          </div>
          <p className="setup-hint">{t('쿼터별 시간은 기록 화면에서 조절합니다.', 'Quarter times are adjustable on the tracking screen.')}</p>
        </div>

        {/* 참가자 풀 */}
        <div
          className={`pool-zone ${hoverZone === 'pool' ? 'hover' : ''}`}
          data-zone="pool"
          onClick={() => zoneTap('pool')}
        >
          <div className="zone-head">
            <span>{t('참석자', 'Attendees')} ({pool.length})</span>
            <div className="zone-head-actions">
              {pool.length > 0 && teams.length > 1 && (
                <button className="pool-distribute" onClick={(e) => { e.stopPropagation(); distributeEvenly(); }}>
                  {t('균등 분배', 'Split evenly')}
                </button>
              )}
              <button className="guest-add" onClick={(e) => { e.stopPropagation(); addGuest(); }}>
                + {t('게스트 추가', 'Add Guest')}
              </button>
            </div>
          </div>
          <div className="chip-wrap">
            {pool.length === 0 && <span className="zone-empty">{t('모두 배치됨', 'All assigned')}</span>}
            {pool.map((p) => (
              <Chip key={p.uid} p={p} inZone="pool" />
            ))}
          </div>
        </div>

        {/* 팀 자동 추천 */}
        <div className="suggest-row">
          <button className="suggest-btn" onClick={() => applySuggestion(teams.length)} disabled={suggesting}>
            {suggesting ? t('추천 중...', 'Suggesting...') : `✨ ${t('팀 자동 추천', 'Suggest Teams')}`}
          </button>
          <span className="suggest-hint">
            {t('실력·포지션·최근 2주 같은 팀을 고려해 배분해요.', 'Balanced by skill, position & recent teammates.')}
          </span>
        </div>

        {/* 팀 존 — 스쿼드 수만큼 컬럼(2팀=2열, 3팀=3열)으로 한눈에 */}
        <div
          className="teams-grid"
          style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}
        >
          {teams.map((tm, idx) => (
            <div
              key={idx}
              className={`team-zone ${hoverZone === String(idx) ? 'hover' : ''}`}
              data-zone={idx}
              onClick={() => zoneTap(idx)}
            >
              <div className="zone-head">
                <input
                  className="team-name"
                  value={tm.label}
                  onChange={(e) => setTeamLabel(idx, e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  maxLength={16}
                />
                <span className="team-count">{tm.members.length}{t('명', '')}</span>
              </div>
              {pool.length > 0 && (
                <button
                  className="grab-rest"
                  onClick={(e) => { e.stopPropagation(); moveAllPoolTo(idx); }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  ↓ {t(`남은 ${pool.length}명 담기`, `Add all ${pool.length}`)}
                </button>
              )}
              <div className="chip-wrap">
                {tm.members.length === 0 && <span className="zone-empty">{t('여기로 드래그', 'Drag here')}</span>}
                {tm.members.map((p) => (
                  <Chip key={p.uid} p={p} inZone={idx} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="start-btn" onClick={handleStart} disabled={starting}>
          {starting
            ? t('처리 중...', 'Working...')
            : match.status === 'live'
              ? t('팀 구성 저장', 'Save Teams')
              : t('라이브 기록 시작', 'Start Live Tracking')}
        </button>
      </div>

      {/* 드래그 고스트 */}
      {drag && drag.moved && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
          {drag.name}
        </div>
      )}
    </div>
  );
};

export default LiveSetupPage;
