import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import './RecordsPage.scss';

const RecordsPage = () => {
  const navigate = useNavigate();
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const language = useLanguageStore((state) => state.language);
  
  const [activeTab, setActiveTab] = useState('aggregate'); // 'aggregate' or 'match'

  useEffect(() => {
    if (!teamInfo) {
      getTeamInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // 더미 데이터 생성 함수
  const generateDummyRecords = () => {
    const dummyData = [];
    for (let i = 1; i <= 15; i++) {
      const gp = 20 + Math.floor(Math.random() * 15);
      const w = Math.floor(gp * (0.4 + Math.random() * 0.3));
      const l = gp - w;
      
      dummyData.push({
        no: i,
        userId: i,
        userName: `선수${i}`,
        userImage: `https://i.pravatar.cc/150?img=${i}`,
        gp: gp,
        w: w,
        l: l,
        pts: (15 + Math.random() * 15).toFixed(1),
        fgPct: (40 + Math.random() * 20).toFixed(1),
        twopPct: (45 + Math.random() * 15).toFixed(1),
        threepPct: (30 + Math.random() * 20).toFixed(1),
        ftPct: (70 + Math.random() * 20).toFixed(1),
        reb: (5 + Math.random() * 8).toFixed(1),
        ast: (3 + Math.random() * 5).toFixed(1),
        stl: (1 + Math.random() * 2).toFixed(1),
        blk: (0.5 + Math.random() * 1.5).toFixed(1),
        to: (2 + Math.random() * 3).toFixed(1),
        dd2: Math.floor(Math.random() * 3),
        td3: Math.floor(Math.random() * 2),
      });
    }
    return dummyData;
  };

  // 사용 가능한 연도 목록 로드
  const loadAvailableYears = async () => {
    try {
      const response = await apiRequest('get', '/team/records/years');
      if (response?.data && response.data.length > 0) {
        setAvailableYears(response.data);
        setSelectedYear(response.data[0]);
      } else {
        // API 응답이 없을 경우 현재 연도만 사용
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear]);
        setSelectedYear(currentYear);
      }
    } catch (error) {
      console.error('연도 목록 로드 실패:', error);
      // 에러 발생 시 현재 연도만 사용
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]);
      setSelectedYear(currentYear);
    }
  };

  // 기록 데이터 로드
  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (selectedYear) {
        params.year = selectedYear;
        if (selectedQuarter) {
          params.quarter = selectedQuarter;
        }
      }

      const response = await apiRequest('get', '/team/records', params);
      if (response?.data && response.data.length > 0) {
        setRecords(response.data);
      } else {
        // API 응답이 없을 경우 더미 데이터 사용
        const dummyData = generateDummyRecords();
        setRecords(dummyData);
      }
    } catch (error) {
      console.error('기록 로드 실패:', error);
      // 에러 발생 시 더미 데이터 사용
      const dummyData = generateDummyRecords();
      setRecords(dummyData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear || (startDate && endDate)) {
      loadRecords();
    } else if (availableYears.length > 0 && !selectedYear) {
      // 연도 목록이 있지만 선택되지 않은 경우 첫 번째 연도로 설정
      setSelectedYear(availableYears[0]);
    }
  }, [selectedYear, selectedQuarter, startDate, endDate, availableYears]);

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value ? parseInt(e.target.value) : null);
    setSelectedQuarter(null);
    setStartDate('');
    setEndDate('');
  };

  const handleQuarterChange = (e) => {
    setSelectedQuarter(e.target.value ? parseInt(e.target.value) : null);
    setStartDate('');
    setEndDate('');
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setSelectedYear(null);
    setSelectedQuarter(null);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setSelectedYear(null);
    setSelectedQuarter(null);
  };

  const getPlayerImage = (userImage, userName, userId) => {
    if (userImage) return userImage;
    return `https://i.pravatar.cc/150?img=${userId || userName}`;
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

  const handleCreateRecord = () => {
    navigate('/locker-room/matches');
  };

  return (
    <div className="records-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{language === 'KR' ? '기록' : 'Records'}</h1>
          <button className="btn btn-primary btn-create-record" onClick={() => navigate('/locker-room/matches')}>
            {language === 'KR' ? '경기 보러가기' : 'Go to Matches'}
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="records-tabs">
          <button
            className={`tab-button ${activeTab === 'aggregate' ? 'active' : ''}`}
            onClick={() => setActiveTab('aggregate')}
          >
            {language === 'KR' ? '통합기록' : 'Aggregate Records'}
          </button>
          <button
            className={`tab-button ${activeTab === 'match' ? 'active' : ''}`}
            onClick={() => setActiveTab('match')}
          >
            {language === 'KR' ? '경기기록' : 'Match Records'}
          </button>
        </div>

        {/* 필터 섹션 */}
        <div className="records-filters">
          <div className="filter-group">
            <label htmlFor="year-select">{language === 'KR' ? '연도' : 'Year'}</label>
            <select
              id="year-select"
              value={selectedYear || ''}
              onChange={handleYearChange}
              className="filter-select"
            >
              <option value="">{language === 'KR' ? '전체' : 'All'}</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="quarter-select">{language === 'KR' ? '분기' : 'Quarter'}</label>
            <select
              id="quarter-select"
              value={selectedQuarter || ''}
              onChange={handleQuarterChange}
              className="filter-select"
              disabled={!selectedYear}
            >
              <option value="">{language === 'KR' ? '전체' : 'All'}</option>
              <option value="1">{language === 'KR' ? '1분기' : 'Q1'}</option>
              <option value="2">{language === 'KR' ? '2분기' : 'Q2'}</option>
              <option value="3">{language === 'KR' ? '3분기' : 'Q3'}</option>
              <option value="4">{language === 'KR' ? '4분기' : 'Q4'}</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="start-date">{language === 'KR' ? '시작일' : 'Start Date'}</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="end-date">{language === 'KR' ? '종료일' : 'End Date'}</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="filter-input"
            />
          </div>
        </div>

        {/* 기록 테이블 */}
        {activeTab === 'aggregate' ? (
          // 통합기록 탭
          loading ? (
            <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
          ) : records.length > 0 ? (
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Profile</th>
                    <th>Name</th>
                    <th>GP</th>
                    <th>W</th>
                    <th>L</th>
                    <th>PTS</th>
                    <th>FG%</th>
                    <th>2P%</th>
                    <th>3P%</th>
                    <th>FT%</th>
                    <th>REB</th>
                    <th>AST</th>
                    <th>STL</th>
                    <th>BLK</th>
                    <th>TO</th>
                    <th>DD2</th>
                    <th>TD3</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.userId}>
                      <td>{record.no}</td>
                      <td>
                        <div className="player-image-cell">
                          <img
                            src={getPlayerImage(record.userImage, record.userName, record.userId)}
                            alt={record.userName}
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(record.userName)}&background=2563eb&color=fff&size=128`;
                            }}
                          />
                        </div>
                      </td>
                      <td>{record.userName}</td>
                      <td>{record.gp}</td>
                      <td>{record.w}</td>
                      <td>{record.l}</td>
                      <td>{record.pts}</td>
                      <td>{record.fgPct}%</td>
                      <td>{record.twopPct}%</td>
                      <td>{record.threepPct}%</td>
                      <td>{record.ftPct}%</td>
                      <td>{record.reb}</td>
                      <td>{record.ast}</td>
                      <td>{record.stl}</td>
                      <td>{record.blk}</td>
                      <td>{record.turnover}</td>
                      <td>{record.dd2}</td>
                      <td>{record.td3}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-message">
                {language === 'KR' ? '기록 데이터가 없습니다.' : 'No records available.'}
              </div>
            </div>
          )
        ) : (
          // 경기기록 탭
          <div className="match-records-section">
            {loading ? (
              <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏀</div>
                <div className="empty-message">
                  {language === 'KR' ? '경기 기록이 없습니다.' : 'No match records available.'}
                </div>
                <button className="btn btn-primary" onClick={handleCreateRecord}>
                  {language === 'KR' ? '경기 보러가기' : 'Go to Matches'}
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
