import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import './RecordsPage.scss';

const pad = (n) => String(n).padStart(2, '0');
// 4분기 기준: 1분기(1~3월) 2분기(4~6월) 3분기(7~9월) 4분기(10~12월)
const monthToQuarter = (month) => Math.ceil(month / 3);

// 통합기록 스탯 컬럼 (정렬 가능). pct=백분율 표기
const STAT_COLS = [
  { key: 'gp', label: 'GP' },
  { key: 'w', label: 'W' },
  { key: 'l', label: 'L' },
  { key: 'pts', label: 'PTS' },
  { key: 'fgPct', label: 'FG%', pct: true },
  { key: 'twopPct', label: '2P%', pct: true },
  { key: 'threepPct', label: '3P%', pct: true },
  { key: 'ftPct', label: 'FT%', pct: true },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'stl', label: 'STL' },
  { key: 'blk', label: 'BLK' },
  { key: 'turnover', label: 'TO' },
  { key: 'dd2', label: 'DD2' },
  { key: 'td3', label: 'TD3' },
];

const RecordsPage = () => {
  const navigate = useNavigate();
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const language = useLanguageStore((state) => state.language);
  const t = (kr, en) => (language === 'KR' ? kr : en);

  const [activeTab, setActiveTab] = useState('aggregate'); // 'aggregate' | 'match'

  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(''); // '' = 전체(전체 기록)
  const [selectedQuarter, setSelectedQuarter] = useState(''); // '' = 전체

  const [records, setRecords] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 'desc' }); // 통합기록 정렬

  useEffect(() => {
    if (!teamInfo) getTeamInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 사용 가능한 연도 목록 로드
  const loadAvailableYears = async () => {
    try {
      const response = await apiRequest('get', '/team/records/years');
      setAvailableYears(response?.data?.length ? response.data : []);
    } catch (error) {
      console.error('연도 목록 로드 실패:', error);
      setAvailableYears([]);
    }
  };

  // 통합기록(집계) 로드 — 연도/분기 필터. 미선택 시 전체 누적.
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedYear) {
        params.year = selectedYear;
        if (selectedQuarter) params.quarter = selectedQuarter;
      }
      const response = await apiRequest('get', '/team/records', params);
      setRecords(response?.data || []);
    } catch (error) {
      console.error('기록 로드 실패:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedQuarter]);

  // 경기기록 로드 — 각 경기를 찾아 상세 기록으로 이동. 기록이 있는(완료) 경기만.
  const loadMatches = useCallback(async () => {
    if (!teamInfo?.id) return;
    setLoading(true);
    try {
      const params = { team_id: teamInfo.id };
      if (selectedYear) params.year = selectedYear;
      const response = await apiRequest('get', '/team/matches', params);
      let list = (response?.data || []).filter((m) => m.status === 'completed');
      if (selectedQuarter) {
        list = list.filter(
          (m) => monthToQuarter(new Date(m.match_date).getMonth() + 1) === Number(selectedQuarter)
        );
      }
      setMatches(list);
    } catch (error) {
      console.error('경기 기록 로드 실패:', error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [teamInfo?.id, selectedYear, selectedQuarter]);

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (!teamInfo?.id) return;
    if (activeTab === 'aggregate') loadRecords();
    else loadMatches();
  }, [activeTab, teamInfo?.id, loadRecords, loadMatches]);

  // 컬럼 헤더 클릭 정렬: 같은 항목이면 방향 토글, 다른 항목이면 기본 방향(이름=오름, 수치=내림)
  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' }
    );
  };

  const sortedRecords = useMemo(() => {
    if (!sort.key) return records;
    const arr = [...records];
    arr.sort((a, b) => {
      if (sort.key === 'name') {
        const cmp = (a.userName || '').localeCompare(b.userName || '');
        return sort.dir === 'asc' ? cmp : -cmp;
      }
      const av = parseFloat(a[sort.key]) || 0;
      const bv = parseFloat(b[sort.key]) || 0;
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [records, sort]);

  const sortIndicator = (key) => (sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅');

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setSelectedQuarter('');
  };

  const handleQuarterChange = (e) => {
    setSelectedQuarter(e.target.value);
  };

  const getPlayerImage = (userImage, userName, userId) => {
    if (userImage) return userImage;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || '?')}&background=ff5a1f&color=fff&size=128`;
  };

  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())}`;
  };

  if (!teamInfo) {
    return (
      <div className="records-page">
        <div className="container">
          <EmptyState showActions={true} actionPath="/recruit" />
        </div>
      </div>
    );
  }

  return (
    <div className="records-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">
            {t('기록', 'Records')}
            <span className="page-subtitle">
              {activeTab === 'aggregate'
                ? t('통합 스탯 집계', 'Aggregate stats')
                : t('경기별 상세 기록', 'Per-match box scores')}
            </span>
          </h1>
          <button className="btn btn-primary btn-create-record" onClick={() => navigate('/locker-room/matches')}>
            {t('경기 보러가기', 'Go to Matches')}
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="records-tabs">
          <button
            className={`tab-button ${activeTab === 'aggregate' ? 'active' : ''}`}
            onClick={() => setActiveTab('aggregate')}
          >
            {t('통합기록', 'Aggregate')}
          </button>
          <button
            className={`tab-button ${activeTab === 'match' ? 'active' : ''}`}
            onClick={() => setActiveTab('match')}
          >
            {t('경기기록', 'Match Records')}
          </button>
        </div>

        {/* 필터 섹션 (연도 · 분기) */}
        <div className="records-filters">
          <div className="filter-group">
            <label htmlFor="year-select">{t('연도', 'Year')}</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              className="filter-select"
            >
              <option value="">{t('전체', 'All')}</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {t(`${year}년`, `${year}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="quarter-select">{t('분기', 'Quarter')}</label>
            <select
              id="quarter-select"
              value={selectedQuarter}
              onChange={handleQuarterChange}
              className="filter-select"
              disabled={!selectedYear}
            >
              <option value="">{t('전체', 'All')}</option>
              <option value="1">{t('1분기 (1~3월)', 'Q1 (Jan–Mar)')}</option>
              <option value="2">{t('2분기 (4~6월)', 'Q2 (Apr–Jun)')}</option>
              <option value="3">{t('3분기 (7~9월)', 'Q3 (Jul–Sep)')}</option>
              <option value="4">{t('4분기 (10~12월)', 'Q4 (Oct–Dec)')}</option>
            </select>
          </div>
        </div>

        {/* 통합기록 탭 */}
        {activeTab === 'aggregate' ? (
          loading ? (
            <div className="loading-spinner">{t('로딩 중...', 'Loading...')}</div>
          ) : records.length > 0 ? (
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th
                      className={`col-player sortable ${sort.key === 'name' ? 'sorted' : ''}`}
                      onClick={() => toggleSort('name')}
                    >
                      {t('선수', 'Player')}
                      <span className="sort-ind">{sortIndicator('name')}</span>
                    </th>
                    {STAT_COLS.map((col) => (
                      <th
                        key={col.key}
                        className={`sortable ${sort.key === col.key ? 'sorted' : ''}`}
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}
                        <span className="sort-ind">{sortIndicator(col.key)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((record) => (
                    <tr key={record.userId}>
                      <td className="col-player">
                        <div className="player-cell">
                          <img
                            className="player-avatar"
                            src={getPlayerImage(record.userImage, record.userName, record.userId)}
                            alt={record.userName}
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(record.userName)}&background=2563eb&color=fff&size=128`;
                            }}
                          />
                          <span className="player-name">{record.userName}</span>
                        </div>
                      </td>
                      {STAT_COLS.map((col) => (
                        <td key={col.key} className={sort.key === col.key ? 'sorted' : ''}>
                          {record[col.key]}
                          {col.pct ? '%' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-message">
                {t('기록 데이터가 없습니다.', 'No records available.')}
              </div>
            </div>
          )
        ) : (
          /* 경기기록 탭 — 각 경기를 눌러 상세 기록 확인 */
          <div className="match-records-section">
            {loading ? (
              <div className="loading-spinner">{t('로딩 중...', 'Loading...')}</div>
            ) : matches.length > 0 ? (
              <div className="match-record-list">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    className="match-record-card"
                    onClick={() => navigate(`/locker-room/matches/${m.id}`)}
                  >
                    <div className="mrc-top">
                      <span className="mrc-date">{fmtDate(m.match_date)}</span>
                      {m.location && <span className="mrc-loc">📍 {m.location}</span>}
                    </div>
                    <div className="mrc-title">{m.title}</div>
                    <div className="mrc-bottom">
                      {m.squads.length > 0 ? (
                        <div className="mrc-score">
                          {m.squads.map((s, i) => (
                            <span key={i} className="mrc-sq">
                              {i > 0 && <span className="mrc-vs">:</span>}
                              <b>{s.label}</b> {s.points}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="mrc-att">🙋 {m.attendeeCount}{t('명 참석', ' attended')}</span>
                      )}
                      <span className="mrc-view">{t('기록 보기', 'View')} ›</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏀</div>
                <div className="empty-message">
                  {t('경기 기록이 없습니다.', 'No match records available.')}
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/locker-room/matches')}>
                  {t('경기 보러가기', 'Go to Matches')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsPage;
