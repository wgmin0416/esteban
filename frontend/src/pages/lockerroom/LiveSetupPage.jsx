import { useState, useEffect } from 'react';
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
        if (d) {
          const attend = d.attendance.list.filter((a) => a.status === 'attend');
          const src = attend.length > 0 ? attend : d.attendance.list;
          setPool(
            src.map((a) => ({ uid: `u${a.user_id}`, userId: a.user_id, name: a.name, image: a.image_url, isGuest: false }))
          );
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
      navigate(`/locker-room/matches/${matchId}/live`);
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
            <button className="guest-add" onClick={(e) => { e.stopPropagation(); addGuest(); }}>
              + {t('게스트 추가', 'Add Guest')}
            </button>
          </div>
          <div className="chip-wrap">
            {pool.length === 0 && <span className="zone-empty">{t('모두 배치됨', 'All assigned')}</span>}
            {pool.map((p) => (
              <Chip key={p.uid} p={p} inZone="pool" />
            ))}
          </div>
        </div>

        {/* 팀 존 */}
        <div className="teams-grid">
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
          {starting ? t('시작 중...', 'Starting...') : t('라이브 기록 시작', 'Start Live Tracking')}
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
