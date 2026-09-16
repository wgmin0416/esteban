import { useState, useEffect, useRef } from 'react';
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
    squadRecorders,
    allSquadsSaved,
    quarterMatchups,
    gameMatchups,
    currentGame,
    setGame,
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
  const [astPickFor, setAstPickFor] = useState(null); // 어시스트 대상 선택 중인 패서 pid
  const [minusMode, setMinusMode] = useState(false); // 잘못 누른 기록 빼기 모드
  const [lineupEdit, setLineupEdit] = useState(false); // 출전 라인업 편집 모드
  // 출전 라인업(쿼터별) { [squadId]: { [quarter]: [pid...] } } — 미설정 시 전원 출전
  const [lineup, setLineup] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`live:${matchId}:lineup`)) || {};
    } catch {
      return {};
    }
  });
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

  // 경기 종료는 전 스쿼드가 전 쿼터를 저장했을 때만 (서버가 최종 검증)
  const allQuartersSaved = allSquadsSaved;
  // 현재 쿼터의 내 스쿼드 기록 담당자
  const myRecorder = squadRecorders?.[mySquadId]?.[currentQuarter]?.name || null;

  // ── 출전 라인업(쿼터별) ──
  const onCourtList = lineup?.[mySquadId]?.[currentQuarter]; // 배열 or undefined(=전원)
  const onCourtSet = onCourtList ? new Set(onCourtList) : null; // null = 전원 출전
  const isOnCourt = (pid) => !onCourtSet || onCourtSet.has(pid);
  const onCourtCount = onCourtSet ? onCourtSet.size : (mySquad?.members?.length || 0);

  const persistLineup = (next) => {
    setLineup(next);
    try {
      localStorage.setItem(`live:${matchId}:lineup`, JSON.stringify(next));
    } catch {
      /* quota 무시 */
    }
  };
  const toggleOnCourt = (pid) => {
    // 미설정이면 전원에서 시작 → 벤치로 뺄 사람만 해제
    const base = onCourtList || (mySquad?.members || []).map((m) => m.pid);
    const cur = new Set(base);
    if (cur.has(pid)) cur.delete(pid);
    else cur.add(pid);
    persistLineup({ ...lineup, [mySquadId]: { ...(lineup[mySquadId] || {}), [currentQuarter]: [...cur] } });
  };
  const copyPrevLineup = () => {
    const prev = lineup?.[mySquadId]?.[currentQuarter - 1];
    if (!prev) return;
    persistLineup({ ...lineup, [mySquadId]: { ...(lineup[mySquadId] || {}), [currentQuarter]: [...prev] } });
  };
  // 출전 선수 앞으로 정렬(원래 순서 유지)
  const sortedMembers = mySquad
    ? [...mySquad.members].sort((a, b) => (isOnCourt(a.pid) ? 0 : 1) - (isOnCourt(b.pid) ? 0 : 1))
    : [];

  // 같은 버튼(선수+이벤트+방향) 0.3초 쿨다운(쓰로틀) — 실수로 두 번 눌러 오기입 방지
  const EVENT_COOLDOWN_MS = 300;
  const lastFireRef = useRef({});
  const guardedApply = (pid, ev, sign) => {
    const key = `${pid}:${ev}:${sign}`;
    const now = Date.now();
    if (now - (lastFireRef.current[key] || 0) < EVENT_COOLDOWN_MS) return; // 쿨다운 중이면 무시
    lastFireRef.current[key] = now;
    applyEvent(pid, ev, sign);
  };

  const handleSaveQuarter = async () => {
    const q = currentQuarter;
    setSavingQuarter(true);
    try {
      // 이 쿼터 출전 라인업(미설정이면 전원 → onCourt 미전송)
      const onCourt = lineup?.[mySquadId]?.[q] || null;
      await saveQuarter(q, onCourt);
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
  const is3way = meta.squads.length >= 3;
  const statsOf = (sid) => (String(sid) === String(mySquadId) ? squadStats : allStats[sid] || {});
  const squadOf = (sid) => meta.squads.find((s) => String(s.squadId) === String(sid));
  // 전 쿼터 누적(2파전) / 현재 쿼터(3파전 대진)
  const quarterPts = (sid, q) =>
    Object.values(statsOf(sid)?.[q] || {}).reduce((sum, st) => sum + statPoints(st), 0);
  const scoreboard = meta.squads.map((s) => ({
    squadId: s.squadId,
    label: s.label,
    points: squadPoints(statsOf(s.squadId)),
    mine: String(s.squadId) === String(mySquadId),
  }));
  // 현재 쿼터 대진(3파전)
  // 게임별 대진: 현재 게임의 두 팀 (게임 모델). 레거시(쿼터별)도 폴백.
  const games = gameMatchups ? Object.keys(gameMatchups).map(Number).sort((a, b) => a - b) : [];
  const curPair = gameMatchups?.[currentGame] || (is3way ? quarterMatchups?.[currentQuarter] : null);

  return (
    <div className="live-track-page">
      <div className="container">
        {/* 스코어보드 */}
        {is3way ? (
          <div className="scoreboard matchup">
            <span className="sb-q">Q{currentQuarter}</span>
            {Array.isArray(curPair) && curPair.length === 2 ? (
              curPair.map((sid, i) => (
                <div
                  key={sid}
                  className={`sb-squad ${String(sid) === String(mySquadId) ? 'mine' : ''}`}
                >
                  {i > 0 && <span className="sb-sep">:</span>}
                  <span className="sb-label">{squadOf(sid)?.label || '?'}</span>
                  <span className="sb-pts">{quarterPts(sid, currentQuarter)}</span>
                </div>
              ))
            ) : (
              <span className="sb-nomatch">{t('이 쿼터 대진을 선택하세요', 'Pick this quarter’s matchup')}</span>
            )}
            <span className={`sb-save ${saving ? 'on' : ''}`}>{saving ? t('저장 중', 'Saving') : t('저장됨', 'Saved')}</span>
          </div>
        ) : (
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
        )}

        {/* 게임 전환 (하루 내 여러 게임) */}
        {games.length > 1 && (
          <div className="game-switch">
            {games.map((g) => {
              const pair = gameMatchups[g] || [];
              const label = pair.map((sid) => squadOf(sid)?.label || '?').join(' vs ');
              return (
                <button
                  key={g}
                  className={`gs-btn ${g === currentGame ? 'on' : ''}`}
                  onClick={() => setGame(g)}
                >
                  <span className="gs-no">G{g}</span>
                  <span className="gs-pair">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 담당 스쿼드 선택 */}
        {!mySquad ? (
          <div className="squad-pick">
            <button
              className="sp-back"
              onClick={() => navigate(`/locker-room/matches/${matchId}/live-setup`)}
            >
              ← {t('팀 배정 다시하기', 'Back to team setup')}
            </button>
            <h2>{t('담당 스쿼드를 선택하세요', 'Pick your squad to score')}</h2>
            {Array.isArray(curPair) && curPair.length === 2 && (
              <p className="sp-matchup">
                {games.length > 1 ? `G${currentGame} ` : ''}{t('대진', 'Matchup')}:{' '}
                <b>{squadOf(curPair[0])?.label} vs {squadOf(curPair[1])?.label}</b>
              </p>
            )}
            <div className="squad-pick-grid">
              {(Array.isArray(curPair) && curPair.length === 2
                ? meta.squads.filter((s) => curPair.map(String).includes(String(s.squadId)))
                : meta.squads
              ).map((s) => (
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

            {/* 현재 쿼터 기록 담당자 */}
            {savedQuarters.includes(currentQuarter) && myRecorder && (
              <div className="qb-recorder">
                Q{currentQuarter} {t('기록 담당', 'Recorded by')}: <b>{myRecorder}</b>
              </div>
            )}

            {/* 출전 라인업 바 */}
            <div className="lineup-bar">
              <span className="lb-label">
                {t('라인업', 'Lineup')} <b>{onCourtCount}</b>{t('명', '')}
                {onCourtSet == null && <em>{t(' (전원)', ' (all)')}</em>}
              </span>
              <div className="lb-actions">
                {lineupEdit && (
                  <button
                    className="lb-copy"
                    disabled={!lineup?.[mySquadId]?.[currentQuarter - 1]}
                    onClick={copyPrevLineup}
                  >
                    {t('이전 쿼터 복사', 'Copy prev Q')}
                  </button>
                )}
                <button
                  className={`lb-edit ${lineupEdit ? 'on' : ''}`}
                  onClick={() => setLineupEdit((v) => !v)}
                >
                  {lineupEdit ? t('완료', 'Done') : t('라인업 편집', 'Edit lineup')}
                </button>
              </div>
            </div>

            {/* 선수 아바타 스트립 (가로 스크롤 선택) */}
            <div className={`player-strip ${lineupEdit ? 'editing' : ''}`}>
              {sortedMembers.map((m) => {
                const total = playerTotal(squadStats, m.pid);
                const sel = selectedPlayer === m.pid;
                const bench = !isOnCourt(m.pid);
                return (
                  <button
                    key={m.pid}
                    className={`ps-player ${sel ? 'sel' : ''} ${bench ? 'bench' : 'active'}`}
                    onClick={() => (lineupEdit ? toggleOnCourt(m.pid) : setSelectedPlayer(m.pid))}
                  >
                    <span className="ps-avatar">
                      <img src={avatar(m.name, m.image_url)} alt={m.name} />
                      {lineupEdit ? (
                        !bench && <span className="ps-check">✓</span>
                      ) : (
                        <span className="ps-pts">{statPoints(total)}</span>
                      )}
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
                        onClick={() => {
                          if (!selectedPlayer) return;
                          // 어시스트(추가 모드)는 득점자 선택 팝업
                          if (ev === 'ast' && !minusMode) {
                            setAstPickFor(selectedPlayer);
                            return;
                          }
                          guardedApply(selectedPlayer, ev, minusMode ? -1 : 1);
                        }}
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

            {/* 어시스트 대상(득점자) 선택 */}
            {astPickFor != null && (() => {
              const passer = mySquad.members.find((x) => x.pid === astPickFor);
              const mates = mySquad.members.filter((x) => x.pid !== astPickFor && isOnCourt(x.pid));
              return (
                <div className="ast-pick-overlay" onClick={() => setAstPickFor(null)}>
                  <div className="ast-pick" onClick={(e) => e.stopPropagation()}>
                    <div className="ap-title">
                      <b>{passer?.name}</b> {t('어시스트 → 득점자 선택', 'Assist → pick scorer')}
                    </div>
                    <div className="ap-grid">
                      {mates.map((x) => (
                        <button
                          key={x.pid}
                          className="ap-btn"
                          onClick={() => {
                            applyEvent(astPickFor, 'ast', 1, x.pid);
                            setAstPickFor(null);
                          }}
                        >
                          <img src={avatar(x.name, x.image_url)} alt={x.name} />
                          <span>{x.name}{x.isGuest ? ' (G)' : ''}</span>
                        </button>
                      ))}
                      {mates.length === 0 && (
                        <div className="ap-empty">{t('출전 중인 동료가 없어요', 'No teammates on court')}</div>
                      )}
                    </div>
                    <button className="ap-cancel" onClick={() => setAstPickFor(null)}>
                      {t('취소', 'Cancel')}
                    </button>
                  </div>
                </div>
              );
            })()}

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

            {/* 경기 종료 (전 스쿼드가 전 쿼터 저장 시 활성화) */}
            <button
              className="end-game-btn"
              disabled={!allQuartersSaved}
              onClick={() => setShowEnd(true)}
            >
              {t('경기 종료', 'Finish Game')}
              {!allQuartersSaved && (
                <span className="egb-hint">
                  {t('모든 팀이 전 쿼터를 저장해야 종료 가능', 'All teams must save every quarter')}
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
