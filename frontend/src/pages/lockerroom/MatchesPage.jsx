import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toastError } from '../../utils/alert';
import './MatchesPage.scss';

const pad = (n) => String(n).padStart(2, '0');
const nowLocalInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MatchesPage = () => {
  const navigate = useNavigate();
  const teamInfo = useTeamStore((s) => s.teamInfo);
  const getTeamInfo = useTeamStore((s) => s.getTeamInfo);
  const myInfo = useAuthStore((s) => s.myInfo);
  const language = useLanguageStore((s) => s.language);
  const t = (kr, en) => (language === 'KR' ? kr : en);

  const canManage =
    ['admin', 'developer'].includes(myInfo?.role) ||
    ['leader', 'manager'].includes(teamInfo?.role);

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [member, setMember] = useState('');
  const [memberQuery, setMemberQuery] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    match_date: nowLocalInput(),
    location: '',
    quarter_count: 4,
  });

  useEffect(() => {
    if (!teamInfo) getTeamInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 멤버 검색 디바운스
  useEffect(() => {
    const id = setTimeout(() => setMemberQuery(member.trim()), 400);
    return () => clearTimeout(id);
  }, [member]);

  const loadMatches = useCallback(async () => {
    if (!teamInfo?.id) return;
    setLoading(true);
    try {
      const params = { team_id: teamInfo.id };
      if (year) params.year = year;
      if (month) params.month = month;
      if (memberQuery) params.member = memberQuery;
      const res = await apiRequest('get', '/team/matches', params);
      setMatches(res?.data || []);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [teamInfo?.id, year, month, memberQuery]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleCreate = async () => {
    if (!teamInfo?.id) return;
    if (!form.title.trim()) {
      toastError(t('경기 제목을 입력하세요.', 'Enter a match title.'));
      return;
    }
    if (!form.match_date) {
      toastError(t('경기 일시를 선택하세요.', 'Pick a match date/time.'));
      return;
    }
    setCreating(true);
    try {
      await apiRequest('post', '/team/match', {
        team_id: teamInfo.id,
        title: form.title.trim(),
        match_date: form.match_date,
        location: form.location.trim(),
        type: 'intra_squad',
        quarter_count: form.quarter_count,
      });
      setShowCreate(false);
      setForm({ title: '', match_date: nowLocalInput(), location: '', quarter_count: 4 });
      loadMatches();
    } catch {
      toastError(t('경기 생성에 실패했습니다.', 'Failed to create match.'));
    } finally {
      setCreating(false);
    }
  };

  const statusMeta = (s) => {
    if (s === 'live') return { cls: 'live', label: t('진행중', 'Live') };
    if (s === 'completed') return { cls: 'done', label: t('종료', 'Done') };
    return { cls: 'scheduled', label: t('예정', 'Scheduled') };
  };

  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  if (!teamInfo) {
    return (
      <div className="matches-page">
        <div className="container">
          <EmptyState showActions actionPath="/recruit" />
        </div>
      </div>
    );
  }

  const years = [thisYear, thisYear - 1, thisYear - 2];

  return (
    <div className="matches-page">
      <div className="container">
        <div className="mp-head">
          <h1 className="page-title">{t('경기', 'Matches')}</h1>
          {canManage && (
            <button className="create-btn" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? t('닫기', 'Close') : `+ ${t('경기 만들기', 'New Match')}`}
            </button>
          )}
        </div>

        {/* 생성 폼 */}
        {canManage && showCreate && (
          <div className="create-card">
            <div className="cc-row">
              <label className="cc-field">
                <span>{t('제목', 'Title')}</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t('팀 내 연습 경기', 'Team practice')}
                />
              </label>
              <label className="cc-field">
                <span>{t('일시', 'Date/Time')}</span>
                <input
                  type="datetime-local"
                  value={form.match_date}
                  onChange={(e) => setForm({ ...form, match_date: e.target.value })}
                />
              </label>
            </div>
            <div className="cc-row">
              <label className="cc-field">
                <span>{t('장소', 'Location')}</span>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder={t('선택 사항', 'Optional')}
                />
              </label>
              <label className="cc-field sm">
                <span>{t('쿼터 수', 'Quarters')}</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={form.quarter_count}
                  onChange={(e) => setForm({ ...form, quarter_count: Math.min(Math.max(parseInt(e.target.value) || 1, 1), 8) })}
                />
              </label>
            </div>
            <button className="cc-submit" onClick={handleCreate} disabled={creating}>
              {creating ? t('생성 중...', 'Creating...') : t('경기 생성', 'Create')}
            </button>
          </div>
        )}

        {/* 필터 */}
        <div className="mp-filters">
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">{t('전체 연도', 'All years')}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}{t('년', '')}</option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={!year}>
            <option value="">{t('전체 월', 'All months')}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}{t('월', '')}</option>
            ))}
          </select>
          <input
            className="member-search"
            type="text"
            value={member}
            onChange={(e) => setMember(e.target.value)}
            placeholder={t('멤버 이름 검색', 'Search member')}
          />
        </div>

        {/* 목록 */}
        {loading ? (
          <LoadingSpinner />
        ) : matches.length === 0 ? (
          <div className="mp-empty">
            <div className="mp-empty-icon">🏀</div>
            <p>{t('경기가 없습니다.', 'No matches.')}</p>
          </div>
        ) : (
          <div className="match-list">
            {matches.map((m) => {
              const sm = statusMeta(m.status);
              return (
                <button
                  key={m.id}
                  className="match-card"
                  onClick={() => navigate(`/locker-room/matches/${m.id}`)}
                >
                  <div className="mc-top">
                    <span className={`mc-status ${sm.cls}`}>{sm.label}</span>
                    <span className="mc-date">{fmtDate(m.match_date)}</span>
                  </div>
                  <div className="mc-title">{m.title}</div>
                  <div className="mc-meta">
                    {m.location && <span className="mc-loc">📍 {m.location}</span>}
                    <span className="mc-att">🙋 {m.attendeeCount}{t('명 참석', '')}</span>
                    {m.myAttendance === 'attend' && <span className="mc-mine">{t('내 참석', 'Attending')}</span>}
                  </div>
                  {m.status === 'completed' && m.squads.length > 0 && (
                    <div className="mc-score">
                      {m.squads.map((s, i) => (
                        <span key={i} className="mc-sq">
                          {i > 0 && <span className="mc-vs">:</span>}
                          <b>{s.label}</b> {s.points}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
