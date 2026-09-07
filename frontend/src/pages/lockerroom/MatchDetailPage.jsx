import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toastSuccess, toastError } from '../../utils/alert';
import './MatchDetailPage.scss';

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};
const avatar = (name, url) =>
  url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=ff5a1f&color=fff&size=128`;

const MatchDetailPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamInfo = useTeamStore((s) => s.teamInfo);
  const myInfo = useAuthStore((s) => s.myInfo);
  const language = useLanguageStore((s) => s.language);
  const t = (kr, en) => (language === 'KR' ? kr : en);

  const canManage =
    ['admin', 'developer'].includes(myInfo?.role) ||
    ['leader', 'manager'].includes(teamInfo?.role);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [quarterView, setQuarterView] = useState(() => {
    const q = parseInt(searchParams.get('q'));
    return Number.isInteger(q) && q > 0 ? q : 0; // 0 = 합산, ?q=N 이면 해당 쿼터 기본 선택
  }); // 0 = 합산
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('get', `/team/match/${matchId}`);
      setDetail(res?.data || null);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (status) => {
    setVoting(true);
    try {
      await apiRequest('put', `/team/match/${matchId}/attendance`, { status });
      await load();
    } catch {
      toastError(t('투표에 실패했습니다.', 'Failed to vote.'));
    } finally {
      setVoting(false);
    }
  };

  const reopenForEdit = async () => {
    setReopening(true);
    try {
      await apiRequest('post', `/team/live/${matchId}/reopen`, {});
      navigate(`/locker-room/matches/${matchId}/live`);
    } catch {
      toastError(t('기록 수정을 여는 데 실패했습니다.', 'Failed to open records for editing.'));
      setReopening(false);
    }
  };

  const cancelMatch = async () => {
    try {
      await apiRequest('delete', `/team/match/${matchId}`);
      toastSuccess(t('경기가 취소되었습니다.', 'Match cancelled.'));
      navigate('/locker-room/matches');
    } catch {
      toastError(t('경기 취소에 실패했습니다.', 'Failed to cancel.'));
    }
  };

  const openEdit = () => {
    setEditForm({
      title: detail.title,
      match_date: toLocalInput(detail.match_date),
      location: detail.location || '',
      quarter_count: detail.quarterCount,
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) {
      toastError(t('경기 제목을 입력하세요.', 'Enter a title.'));
      return;
    }
    setSavingEdit(true);
    try {
      await apiRequest('put', `/team/match/${matchId}`, {
        title: editForm.title.trim(),
        match_date: editForm.match_date,
        location: editForm.location.trim(),
        quarter_count: editForm.quarter_count,
      });
      setShowEdit(false);
      toastSuccess(t('경기가 수정되었습니다.', 'Match updated.'));
      await load();
    } catch {
      toastError(t('경기 수정에 실패했습니다.', 'Failed to update.'));
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="match-detail-page">
        <div className="container"><LoadingSpinner /></div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="match-detail-page">
        <div className="container">
          <div className="md-empty">
            <div className="md-empty-icon">🏀</div>
            <p>{t('경기를 찾을 수 없습니다.', 'Match not found.')}</p>
            <button className="md-btn" onClick={() => navigate('/locker-room/matches')}>
              {t('경기 목록으로', 'Back to Matches')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dt = new Date(detail.match_date);
  const dateStr = `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  const statusMeta =
    detail.status === 'live'
      ? { cls: 'live', label: t('진행중', 'Live') }
      : detail.status === 'completed'
        ? { cls: 'done', label: t('종료', 'Done') }
        : { cls: 'scheduled', label: t('예정', 'Scheduled') };

  const { attendance, result } = detail;

  // 결과: 쿼터 필터 적용된 선수 스탯
  const playersToShow = () => {
    if (!result) return [];
    if (quarterView === 0) return result.players;
    const rows = result.quarters?.[quarterView] || [];
    const byKey = {};
    for (const r of rows) byKey[r.key] = r;
    return result.players.map((p) => {
      const q = byKey[p.key];
      return {
        ...p,
        pts: q?.pts ?? 0, reb: q?.reb ?? 0, ast: q?.ast ?? 0,
        stl: q?.stl ?? 0, blk: q?.blk ?? 0, turnover: q?.turnover ?? 0, pf: q?.pf ?? 0,
      };
    });
  };

  return (
    <div className="match-detail-page">
      <div className="container">
        <button className="back-link" onClick={() => navigate('/locker-room/matches')}>
          ← {t('경기 목록', 'Matches')}
        </button>

        {/* 헤더 */}
        <div className="md-header">
          <span className={`md-status ${statusMeta.cls}`}>{statusMeta.label}</span>
          <h1 className="md-title">{detail.title}</h1>
          <div className="md-sub">
            <span>🗓 {dateStr}</span>
            {detail.location && <span>📍 {detail.location}</span>}
            <span>⏱ {detail.quarterCount}Q · {detail.quarterMinutes}{t('분', 'min')}</span>
          </div>
        </div>

        {/* 결과 (완료 또는 쿼터별 누적 저장으로 기록 존재 시) */}
        {result && (
          <section className="md-result">
            <div className="result-scores">
              {result.squads.map((s) => (
                <div key={s.squadId} className={`rs-squad ${s.isWin ? 'win' : ''}`}>
                  <span className="rs-label">{s.label}{s.isWin && ' 🏆'}</span>
                  <span className="rs-pts">{s.points}</span>
                </div>
              ))}
            </div>

            <div className="quarter-filter">
              <button className={quarterView === 0 ? 'on' : ''} onClick={() => setQuarterView(0)}>
                {t('전체', 'Total')}
              </button>
              {(result.savedQuarters?.length
                ? result.savedQuarters
                : Array.from({ length: detail.quarterCount }, (_, i) => i + 1)
              ).map((q) => (
                <button key={q} className={quarterView === q ? 'on' : ''} onClick={() => setQuarterView(q)}>
                  Q{q}
                </button>
              ))}
            </div>

            <div className="box-score">
              <table>
                <thead>
                  <tr>
                    <th>{t('선수', 'Player')}</th>
                    <th>{t('팀', 'Sq')}</th>
                    <th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th>
                    {quarterView === 0 && (<><th>FG%</th><th>3P%</th><th>FT%</th></>)}
                  </tr>
                </thead>
                <tbody>
                  {playersToShow().map((p) => (
                    <tr key={p.key}>
                      <td className="bs-name">{p.name}{p.isGuest ? ' (G)' : ''}</td>
                      <td>{p.squad_label || '-'}</td>
                      <td className="bs-pts">{p.pts}</td>
                      <td>{p.reb}</td><td>{p.ast}</td><td>{p.stl}</td><td>{p.blk}</td><td>{p.turnover}</td><td>{p.pf}</td>
                      {quarterView === 0 && (<><td>{p.fg_pct}</td><td>{p.threep_pct}</td><td>{p.ft_pct}</td></>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 참석 투표 (기록 저장 전에만 노출) */}
        {!result && (
        <section className="md-vote">
          <h2 className="md-section-title">{t('참석 투표', 'Attendance')}</h2>
          <div className="vote-buttons">
            {['attend', 'pending', 'absent'].map((st) => (
              <button
                key={st}
                className={`vb ${st} ${attendance.mine === st ? 'on' : ''}`}
                disabled={voting}
                onClick={() => vote(st)}
              >
                {st === 'attend' ? t('참석', 'Attend') : st === 'absent' ? t('불참', 'Absent') : t('미정', 'Pending')}
              </button>
            ))}
          </div>
          <div className="vote-summary">
            <span className="vs attend">{t('참석', 'Attend')} {attendance.summary.attend}</span>
            <span className="vs absent">{t('불참', 'Absent')} {attendance.summary.absent}</span>
            <span className="vs pending">{t('미정', 'Pending')} {attendance.summary.pending}</span>
          </div>
          <div className="vote-list">
            {attendance.list.map((a) => (
              <div key={a.user_id} className={`vl-item ${a.status}`}>
                <img src={avatar(a.name, a.image_url)} alt={a.name} />
                <span className="vl-name">{a.name}</span>
                <span className={`vl-badge ${a.status}`}>
                  {a.status === 'attend' ? t('참석', 'O') : a.status === 'absent' ? t('불참', 'X') : t('미정', '?')}
                </span>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* 상태별 액션 */}
        <section className="md-actions">
          {detail.status === 'scheduled' && (
            <>
              <button className="act primary" onClick={() => navigate(`/locker-room/matches/${matchId}/live-setup`)}>
                🔴 {t('라이브 기록 시작', 'Start Live Tracking')}
              </button>
              <button className="act ghost" onClick={() => navigate(`/locker-room/matches/${matchId}/record`)}>
                {t('기록 직접 입력', 'Manual Record')}
              </button>
              {canManage && (
                <button className="act ghost" onClick={openEdit}>
                  {t('경기 수정', 'Edit Match')}
                </button>
              )}
              {canManage && (
                <button className="act danger" onClick={() => setConfirmCancel(true)}>
                  {t('경기 취소', 'Cancel Match')}
                </button>
              )}
            </>
          )}
          {detail.status === 'live' && (
            <>
              <button className="act primary" onClick={() => navigate(`/locker-room/matches/${matchId}/live`)}>
                🔴 {t('라이브 기록 이어서', 'Continue Live Tracking')}
              </button>
              {canManage && (
                <button className="act ghost" onClick={openEdit}>
                  {t('경기 수정', 'Edit Match')}
                </button>
              )}
            </>
          )}
          {detail.status === 'completed' && canManage && (
            <button className="act ghost" disabled={reopening} onClick={reopenForEdit}>
              {reopening ? t('여는 중...', 'Opening...') : t('기록 수정', 'Edit Records')}
            </button>
          )}
        </section>

        {showEdit && editForm && (
          <div className="md-overlay" onClick={() => !savingEdit && setShowEdit(false)}>
            <div className="md-modal edit" onClick={(e) => e.stopPropagation()}>
              <h3>{t('경기 수정', 'Edit Match')}</h3>
              <label className="ef-field">
                <span>{t('제목', 'Title')}</span>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </label>
              <label className="ef-field">
                <span>{t('일시', 'Date/Time')}</span>
                <input
                  type="datetime-local"
                  value={editForm.match_date}
                  onChange={(e) => setEditForm({ ...editForm, match_date: e.target.value })}
                />
              </label>
              <label className="ef-field">
                <span>{t('장소', 'Location')}</span>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </label>
              {detail.status === 'scheduled' && (
                <label className="ef-field">
                  <span>{t('쿼터 수', 'Quarters')}</span>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={editForm.quarter_count}
                    onChange={(e) =>
                      setEditForm({ ...editForm, quarter_count: Math.min(Math.max(parseInt(e.target.value) || 1, 1), 8) })
                    }
                  />
                </label>
              )}
              <div className="md-modal-actions">
                <button className="cancel" disabled={savingEdit} onClick={() => setShowEdit(false)}>
                  {t('닫기', 'Close')}
                </button>
                <button className="confirm" disabled={savingEdit} onClick={saveEdit}>
                  {savingEdit ? t('저장 중...', 'Saving...') : t('저장', 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmCancel && (
          <div className="md-overlay" onClick={() => setConfirmCancel(false)}>
            <div className="md-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('경기를 취소할까요?', 'Cancel this match?')}</h3>
              <p>{t('참석투표와 구성이 모두 삭제됩니다.', 'Attendance and setup will be deleted.')}</p>
              <div className="md-modal-actions">
                <button className="cancel" onClick={() => setConfirmCancel(false)}>{t('닫기', 'Close')}</button>
                <button className="confirm" onClick={cancelMatch}>{t('경기 취소', 'Cancel Match')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchDetailPage;
