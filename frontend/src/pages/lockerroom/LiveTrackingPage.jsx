import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useLiveGameStore, {
  EVENT_DEFS,
  blankStat,
  statPoints,
  statReb,
  playerTotal,
  squadPoints,
} from '../../store/useLiveGameStore';

const pct = (m, a) => (a > 0 ? Math.round((m / a) * 100) : 0);
import useLanguageStore from '../../store/useLanguageStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toastSuccess, toastError } from '../../utils/alert';
import './LiveTrackingPage.scss';

const avatar = (name, url) =>
  url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=ff5a1f&color=fff&size=128`;

// 이벤트 패드 그룹 구성
const EVENT_GROUPS = [
  { key: 'score', events: ['make2', 'miss2', 'make3', 'miss3', 'makeFt', 'missFt'] },
  { key: 'reb', events: ['oreb', 'dreb'] },
  { key: 'etc', events: ['ast', 'stl', 'blk', 'turnover', 'pf'] },
];

const LiveTrackingPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const language = useLanguageStore((s) => s.language);
  const t = (kr, en) => (language === 'KR' ? kr : en);

  const {
    meta,
    quarterMinutes,
    savedQuarters,
    allStats,
    mySquadId,
    currentQuarter,
    squadStats,
    eventLog,
    loading,
    saving,
    loadDraft,
    refreshScoreboard,
    setMySquad,
    clearMySquad,
    setQuarter,
    setQuarterMinutes,
    applyEvent,
    undo,
    flushSave,
    saveQuarter,
    finish,
  } = useLiveGameStore();

  const [notFound, setNotFound] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [minusMode, setMinusMode] = useState(false); // 잘못 누른 기록 빼기 모드
  const [showSave, setShowSave] = useState(false);
  const [savingQuarter, setSavingQuarter] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  // 드래프트 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await loadDraft(matchId);
      if (alive && !ok) setNotFound(true);
    })();
    return () => {
      alive = false;
      flushSave(); // 이탈 시 최신값 Redis 저장
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // 스코어보드 폴링 + 백그라운드 전환 시 저장
  useEffect(() => {
    const timer = setInterval(() => refreshScoreboard(), 15000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mySquad = meta?.squads?.find((s) => String(s.squadId) === String(mySquadId));

  // 모든 쿼터가 저장되어야 경기 종료 가능
  const quarterCount = meta?.quarterCount || 0;
  const allQuartersSaved =
    quarterCount > 0 &&
    Array.from({ length: quarterCount }, (_, i) => i + 1).every((n) => savedQuarters.includes(n));

  const handleSaveQuarter = async () => {
    const q = currentQuarter;
    setSavingQuarter(true);
    try {
      await saveQuarter(q);
      toastSuccess(t(`Q${q} 기록이 저장되었습니다.`, `Q${q} record saved.`));
      setShowSave(false);
    } catch {
      toastError(t('저장에 실패했습니다.', 'Failed to save.'));
    } finally {
      setSavingQuarter(false);
    }
  };

  const handleEndGame = async () => {
    setEnding(true);
    try {
      await finish();
      toastSuccess(t('경기가 종료되었습니다.', 'Game finished.'));
      navigate(`/locker-room/matches/${matchId}`);
    } catch {
      toastError(t('경기 종료에 실패했습니다.', 'Failed to finish the game.'));
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="live-track-page">
        <div className="container"><LoadingSpinner /></div>
      </div>
    );
  }

  if (notFound || !meta) {
    return (
      <div className="live-track-page">
        <div className="container">
          <div className="lt-empty">
            <div className="lt-empty-icon">🏀</div>
            <p>{t('진행 중인 경기를 찾을 수 없습니다.', 'Live game not found.')}</p>
            <button className="lt-btn" onClick={() => navigate(`/locker-room/matches/${matchId}`)}>
              {t('경기로 돌아가기', 'Back to Match')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 스코어보드 데이터
  const scoreboard = meta.squads.map((s) => {
    const stats = String(s.squadId) === String(mySquadId) ? squadStats : allStats[s.squadId] || {};
    return { squadId: s.squadId, label: s.label, points: squadPoints(stats), mine: String(s.squadId) === String(mySquadId) };
  });

  return (
    <div className="live-track-page">
      <div className="container">
        {/* 스코어보드 */}
        <div className="scoreboard">
          {scoreboard.map((s, i) => (
            <div key={s.squadId} className={`sb-squad ${s.mine ? 'mine' : ''}`}>
              {i > 0 && <span className="sb-sep">:</span>}
              <span className="sb-label">{s.label}</span>
              <span className="sb-pts">{s.points}</span>
            </div>
          ))}
          <span className={`sb-save ${saving ? 'on' : ''}`}>{saving ? t('저장 중', 'Saving') : t('저장됨', 'Saved')}</span>
        </div>

        {/* 담당 스쿼드 선택 */}
        {!mySquad ? (
          <div className="squad-pick">
            <h2>{t('담당 스쿼드를 선택하세요', 'Pick your squad to score')}</h2>
            <div className="squad-pick-grid">
              {meta.squads.map((s) => (
                <button
                  key={s.squadId}
                  className="squad-pick-btn"
                  onClick={() => setMySquad(s.squadId)}
                >
                  <span className="spb-label">{s.label}</span>
                  <span className="spb-count">{s.members.length}{t('명', ' players')}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 쿼터 바 */}
            <div className="quarter-bar">
              <div className="qb-tabs">
                {Array.from({ length: meta.quarterCount }, (_, i) => i + 1).map((q) => {
                  const isSaved = savedQuarters.includes(q);
                  return (
                    <button
                      key={q}
                      className={`${currentQuarter === q ? 'on' : ''} ${isSaved ? 'saved' : ''}`}
                      onClick={() => setQuarter(q)}
                    >
                      Q{q}{isSaved ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
              <div className="qb-min">
                <span className="qb-min-label">Q{currentQuarter} {t('시간', 'time')}</span>
                <div className="qb-stepper">
                  <button
                    onClick={() => setQuarterMinutes(currentQuarter, (quarterMinutes[currentQuarter - 1] || 10) - 1)}
                    aria-label="minus"
                  >
                    −
                  </button>
                  <span className="qb-min-val">{quarterMinutes[currentQuarter - 1] || 10}{t('분', 'm')}</span>
                  <button
                    onClick={() => setQuarterMinutes(currentQuarter, (quarterMinutes[currentQuarter - 1] || 10) + 1)}
                    aria-label="plus"
                  >
                    ＋
                  </button>
                </div>
              </div>
              <button
                className="qb-squad"
                onClick={() => { flushSave(); setSelectedPlayer(null); clearMySquad(); }}
              >
                {t('담당', 'Squad')}: <b>{mySquad.label}</b>
                <span className="qb-change">{t('변경', 'Change')}</span>
              </button>
            </div>

            {/* 선수 아바타 스트립 (가로 스크롤 선택) */}
            <div className="player-strip">
              {mySquad.members.map((m) => {
                const total = playerTotal(squadStats, m.pid);
                const sel = selectedPlayer === m.pid;
                return (
                  <button
                    key={m.pid}
                    className={`ps-player ${sel ? 'sel' : ''}`}
                    onClick={() => setSelectedPlayer(m.pid)}
                  >
                    <span className="ps-avatar">
                      <img src={avatar(m.name, m.image_url)} alt={m.name} />
                      <span className="ps-pts">{statPoints(total)}</span>
                    </span>
                    <span className="ps-name">{m.name}{m.isGuest ? ' (G)' : ''}</span>
                  </button>
                );
              })}
            </div>

            {/* 선택 선수 포커스 카드 */}
            {(() => {
              const m = mySquad.members.find((x) => x.pid === selectedPlayer);
              if (!m) {
                return (
                  <div className="focus-empty">
                    👆 {t('위에서 선수를 선택하세요', 'Select a player above')}
                  </div>
                );
              }
              const total = playerTotal(squadStats, m.pid);
              // 기록/수정은 현재 쿼터 기준 → 카드도 현재 쿼터를 보여줘 add/subtract가 바로 반영
              const cur = squadStats?.[currentQuarter]?.[m.pid] || blankStat();
              const makes = cur.makes || [];
              return (
                <div className="focus-card">
                  <div className="fc-top">
                    <img className="fc-avatar" src={avatar(m.name, m.image_url)} alt={m.name} />
                    <div className="fc-headline">
                      <div className="fc-name">
                        <span className="fc-rec"><i className="fc-dot" />Q{currentQuarter} {t('기록 중', 'RECORDING')}</span>
                        <span className="fc-nm">{m.name}{m.isGuest ? ' (G)' : ''}</span>
                        <span className="fc-q">{t('누적', 'Total')} {statPoints(total)}{t('점', 'pt')}</span>
                      </div>
                      <div className="fc-pts">
                        {statPoints(cur)}<i>{t('점', 'pt')}</i>
                      </div>
                    </div>
                  </div>

                  {/* 이 쿼터 성공 슛 */}
                  <div className="fc-makes">
                    {makes.length === 0 ? (
                      <span className="fc-makes-empty">{t('이 쿼터 성공 슛 없음', 'No made shots this quarter')}</span>
                    ) : (
                      makes.map((v, i) => (
                        <span key={i} className={`mk mk-${v}`}>{v}</span>
                      ))
                    )}
                  </div>

                  {/* 이 쿼터 시도/성공률 */}
                  <div className="fc-shoot">
                    <span>FG {cur.fgm}/{cur.fga} <em>{pct(cur.fgm, cur.fga)}%</em></span>
                    <span>3P {cur.threepm}/{cur.threepa} <em>{pct(cur.threepm, cur.threepa)}%</em></span>
                    <span>FT {cur.ftm}/{cur.fta} <em>{pct(cur.ftm, cur.fta)}%</em></span>
                  </div>

                  <div className="fc-sub">
                    <span>REB {statReb(cur)}</span>
                    <span>AST {cur.ast}</span>
                    <span>STL {cur.stl}</span>
                    <span>BLK {cur.blk}</span>
                    <span>TO {cur.turnover}</span>
                    <span>PF {cur.pf}</span>
                  </div>
                </div>
              );
            })()}

            {/* 이벤트 패드 */}
            <div className={`event-pad ${minusMode ? 'minus' : ''}`}>
              <div className="ep-head">
                <span className="ep-mode-label">
                  {minusMode
                    ? t('빼기 모드 · 잘못 누른 기록을 탭해서 취소', 'Minus mode · tap to remove a stat')
                    : t('기록 추가 모드', 'Add mode')}
                </span>
                <button
                  className={`ep-mode-toggle ${minusMode ? 'on' : ''}`}
                  onClick={() => setMinusMode((v) => !v)}
                >
                  {minusMode ? t('＋ 추가로', '＋ Add') : t('－ 빼기', '－ Subtract')}
                </button>
              </div>
              {EVENT_GROUPS.map((group) => (
                <div key={group.key} className={`ep-group ep-${group.key}`}>
                  {group.events.map((ev) => {
                    const def = EVENT_DEFS[ev];
                    return (
                      <button
                        key={ev}
                        className={`ev-btn tone-${def.tone}`}
                        disabled={!selectedPlayer}
                        onClick={() => selectedPlayer && applyEvent(selectedPlayer, ev, minusMode ? -1 : 1)}
                      >
                        {minusMode ? '−' : ''}{t(def.label, def.labelEn).replace(' ', '\n')}
                      </button>
                    );
                  })}
                </div>
              ))}
              <button className="undo-btn" disabled={eventLog.length === 0} onClick={undo}>
                ↶ {t('되돌리기', 'Undo')} {eventLog.length > 0 ? `(${eventLog.length})` : ''}
              </button>
            </div>

            {/* 하단 액션 */}
            <div className="lt-actions">
              <button className="leave-btn" onClick={() => { flushSave(); navigate(`/locker-room/matches/${matchId}`); }}>
                {t('나가기(자동저장)', 'Leave (autosaved)')}
              </button>
              <button className="finish-btn" onClick={() => setShowSave(true)}>
                {savedQuarters.includes(currentQuarter)
                  ? t(`Q${currentQuarter} 다시 저장`, `Re-save Q${currentQuarter}`)
                  : t(`Q${currentQuarter} 저장`, `Save Q${currentQuarter}`)}
              </button>
            </div>

            {/* 경기 종료 (모든 쿼터 저장 시 활성화) */}
            <button
              className="end-game-btn"
              disabled={!allQuartersSaved}
              onClick={() => setShowEnd(true)}
            >
              {t('경기 종료', 'Finish Game')}
              {!allQuartersSaved && (
                <span className="egb-hint">
                  {t(`쿼터 저장 ${savedQuarters.length}/${quarterCount}`, `Saved ${savedQuarters.length}/${quarterCount}`)}
                </span>
              )}
            </button>
          </>
        )}

        {/* 경기 종료 확인 */}
        {showEnd && (
          <div className="lt-overlay" onClick={() => !ending && setShowEnd(false)}>
            <div className="lt-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('경기를 종료할까요?', 'Finish the game?')}</h3>
              <p>{t('모든 쿼터 기록이 확정되고 경기가 완료 처리됩니다.', 'All quarter records are finalized and the game will be marked completed.')}</p>
              <div className="lt-modal-actions">
                <button className="cancel" disabled={ending} onClick={() => setShowEnd(false)}>
                  {t('취소', 'Cancel')}
                </button>
                <button className="confirm" disabled={ending} onClick={handleEndGame}>
                  {ending ? t('종료 중...', 'Finishing...') : t('경기 종료', 'Finish Game')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 쿼터 저장 확인 */}
        {showSave && (
          <div className="lt-overlay" onClick={() => !savingQuarter && setShowSave(false)}>
            <div className="lt-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t(`Q${currentQuarter} 기록을 저장할까요?`, `Save Q${currentQuarter} record?`)}</h3>
              <p>
                {savedQuarters.includes(currentQuarter)
                  ? t('이미 저장된 쿼터입니다. 현재 기록으로 덮어씁니다.', 'This quarter is already saved. It will be overwritten.')
                  : t('모든 스쿼드의 이 쿼터 기록이 저장됩니다.', 'This quarter for all squads will be saved.')}
              </p>
              <div className="lt-modal-actions">
                <button className="cancel" disabled={savingQuarter} onClick={() => setShowSave(false)}>
                  {t('취소', 'Cancel')}
                </button>
                <button className="confirm" disabled={savingQuarter} onClick={handleSaveQuarter}>
                  {savingQuarter ? t('저장 중...', 'Saving...') : t('저장', 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingPage;
