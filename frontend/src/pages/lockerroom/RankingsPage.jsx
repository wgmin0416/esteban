import { useState, useEffect } from 'react';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import './RankingsPage.scss';

const RankingsPage = () => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const language = useLanguageStore((state) => state.language);

  // 랭킹 카테고리 옵션
  const categoryOptions = [
    { value: 'TOTAL', label: '전체', labelEn: 'Total' },
    { value: 'GP', label: '경기수', labelEn: 'GP' },
    { value: 'W', label: '승리', labelEn: 'W' },
    { value: 'L', label: '패배', labelEn: 'L' },
    { value: 'POINTS', label: '득점', labelEn: 'PTS' },
    { value: 'REBOUNDS', label: '리바운드', labelEn: 'REB' },
    { value: 'ASSISTS', label: '어시스트', labelEn: 'AST' },
    { value: 'BLOCKS', label: '블락', labelEn: 'BLK' },
    { value: 'STEALS', label: '스틸', labelEn: 'STL' },
    { value: 'TURNOVERS', label: '턴오버', labelEn: 'TO' },
    { value: 'FOULS', label: '파울', labelEn: 'Fouls' },
    { value: 'FIELD_GOAL_PCT', label: '필드골 성공률', labelEn: 'FG%' },
    { value: 'THREE_POINTER_PCT', label: '3점슛 성공률', labelEn: '3P%' },
    { value: 'FREE_THROW_PCT', label: '자유투 성공률', labelEn: 'FT%' },
    { value: 'BEST_DUO', label: '최고의 듀오', labelEn: 'Best Duo' },
    { value: 'WORST_DUO', label: '최악의 듀오', labelEn: 'Worst Duo' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('TOTAL');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([2024, 2025, 2026]);
  const [rankings, setRankings] = useState([]);
  const [duos, setDuos] = useState([]);
  const [loading, setLoading] = useState(false);

  // 더미 데이터 생성 함수
  const generateDummyRankings = (category, year) => {
    const dummyData = [];
    const categoryLabels = {
      TOTAL: '종합 점수',
      POINTS: '득점',
      REBOUNDS: '리바운드',
      ASSISTS: '어시스트',
      BLOCKS: '블락',
      STEALS: '스틸',
      TURNOVERS: '턴오버',
      FOULS: '파울',
      FIELD_GOAL_PCT: '필드골 성공률',
      THREE_POINTER_PCT: '3점슛 성공률',
      FREE_THROW_PCT: '자유투 성공률',
    };

    const getValue = (rank, category) => {
      const baseValues = {
        TOTAL: 1000 - rank * 50,
        GAMES_PLAYED: 30 - rank * 1,
        POINTS: 25 - rank * 1.5,
        REBOUNDS: 12 - rank * 0.8,
        ASSISTS: 10 - rank * 0.6,
        BLOCKS: 5 - rank * 0.3,
        STEALS: 4 - rank * 0.2,
        TURNOVERS: 3 + rank * 0.1,
        FOULS: 2 + rank * 0.1,
        FIELD_GOAL_PCT: 55 - rank * 2,
        THREE_POINTER_PCT: 40 - rank * 1.5,
        FREE_THROW_PCT: 85 - rank * 2,
      };
      return baseValues[category] || 0;
    };

    const getUnit = (category) => {
      if (category.includes('PCT')) return '%';
      if (category === 'POINTS') return '점';
      return '개';
    };

    for (let i = 1; i <= 10; i++) {
      dummyData.push({
        rank: i,
        userId: i,
        userName: `선수${i}`,
        userImage: `https://via.placeholder.com/100/2563eb/ffffff?text=${i}`,
        value: getValue(i, category),
        unit: getUnit(category),
        category: categoryLabels[category],
        year: year,
        // 추가 통계 정보
        gamesPlayed: 20 - Math.floor(i / 2),
        wins: 15 - Math.floor(i / 2),
        losses: 5 + Math.floor(i / 2),
      });
    }
    return dummyData;
  };

  // 랭킹 데이터 로드
  const loadRankings = async (category, year) => {
    setLoading(true);
    try {
      // 듀오 랭킹인 경우
      if (category === 'BEST_DUO' || category === 'WORST_DUO') {
        const type = category === 'BEST_DUO' ? 'best' : 'worst';
        const response = await apiRequest('get', '/team/rankings/duos', { year, type });
        if (response?.data) {
          setDuos(response.data);
          setRankings([]);
        } else {
          setDuos([]);
          setRankings([]);
        }
      } else {
        // 일반 랭킹
        const response = await apiRequest('get', '/team/rankings', { category, year });
        if (response?.data && response.data.length > 0) {
          setRankings(response.data);
          setDuos([]);
        } else {
          // API 응답이 없을 경우 더미 데이터 사용
          const dummyData = generateDummyRankings(category, year);
          setRankings(dummyData);
          setDuos([]);
        }
      }
    } catch (error) {
      console.error('랭킹 로드 실패:', error);
      // 에러 발생 시
      if (category === 'BEST_DUO' || category === 'WORST_DUO') {
        setDuos([]);
        setRankings([]);
      } else {
        const dummyData = generateDummyRankings(category, year);
        setRankings(dummyData);
        setDuos([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 사용 가능한 연도 목록 로드
  const loadAvailableYears = async () => {
    try {
      const response = await apiRequest('get', '/team/rankings/years');
      if (response?.data && response.data.length > 0) {
        setAvailableYears(response.data);
        // 첫 번째 연도를 기본값으로 설정
        if (!selectedYear || !response.data.includes(selectedYear)) {
          setSelectedYear(response.data[0]);
        }
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

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (teamInfo?.id) {
      loadRankings(selectedCategory, selectedYear);
    }
  }, [selectedCategory, selectedYear, teamInfo]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  // 카테고리별 단위 및 라벨 매핑
  const getCategoryInfo = (category) => {
    const categoryMap = {
      TOTAL: {
        label: language === 'KR' ? '종합 점수' : 'Total Score',
        unit: language === 'KR' ? '점' : 'pts',
      },
      GP: {
        label: language === 'KR' ? '경기수' : 'GP',
        unit: language === 'KR' ? '경기' : 'games',
      },
      W: {
        label: language === 'KR' ? '승리' : 'W',
        unit: language === 'KR' ? '승' : 'wins',
      },
      L: {
        label: language === 'KR' ? '패배' : 'L',
        unit: language === 'KR' ? '패' : 'losses',
      },
      POINTS: {
        label: language === 'KR' ? '득점' : 'PTS',
        unit: language === 'KR' ? '점' : 'pts',
      },
      REBOUNDS: {
        label: language === 'KR' ? '리바운드' : 'REB',
        unit: language === 'KR' ? '개' : '',
      },
      ASSISTS: {
        label: language === 'KR' ? '어시스트' : 'AST',
        unit: language === 'KR' ? '개' : '',
      },
      BLOCKS: {
        label: language === 'KR' ? '블락' : 'BLK',
        unit: language === 'KR' ? '개' : '',
      },
      STEALS: {
        label: language === 'KR' ? '스틸' : 'STL',
        unit: language === 'KR' ? '개' : '',
      },
      TURNOVERS: {
        label: language === 'KR' ? '턴오버' : 'TO',
        unit: language === 'KR' ? '개' : '',
      },
      FOULS: {
        label: language === 'KR' ? '파울' : 'Fouls',
        unit: language === 'KR' ? '개' : '',
      },
      FIELD_GOAL_PCT: {
        label: language === 'KR' ? '필드골 성공률' : 'FG%',
        unit: '%',
      },
      THREE_POINTER_PCT: {
        label: language === 'KR' ? '3점슛 성공률' : '3P%',
        unit: '%',
      },
      FREE_THROW_PCT: {
        label: language === 'KR' ? '자유투 성공률' : 'FT%',
        unit: '%',
      },
      BEST_DUO: {
        label: language === 'KR' ? '최고의 듀오' : 'Best Duo',
        unit: '%',
      },
      WORST_DUO: {
        label: language === 'KR' ? '최악의 듀오' : 'Worst Duo',
        unit: '%',
      },
    };
    return (
      categoryMap[category] || {
        label: language === 'KR' ? '종합 점수' : 'Total Score',
        unit: language === 'KR' ? '점' : 'pts',
      }
    );
  };

  const categoryInfo = getCategoryInfo(selectedCategory);

  // 듀오 랭킹인 경우 1위 프로필 표시 안 함
  const isDuoRanking = selectedCategory === 'BEST_DUO' || selectedCategory === 'WORST_DUO';

  return (
    <div className="rankings-page">
      <div className="container">
        <h1 className="page-title">
          {language === 'KR' ? '랭킹' : 'Rankings'}
          <span className="page-subtitle">
            {language === 'KR'
              ? '(연간 경기수 20회 이상)'
              : '(Players with 20+ games played per year)'}
          </span>
        </h1>

        {/* 필터 섹션 */}
        <div className="rankings-filters">
          <div className="filter-group">
            <label htmlFor="category-select">{language === 'KR' ? '항목' : 'Category'}</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="filter-select"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {language === 'KR' ? option.label : option.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="year-select">{language === 'KR' ? '시즌' : 'Season'}</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              className="filter-select"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {language === 'KR' ? `${year}년` : `${year}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1위 선수 프로필 또는 듀오 랭킹 */}
        {loading ? (
          <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
        ) : isDuoRanking ? (
          duos.length > 0 ? (
            <div className="rankings-list">
              {duos.map((duo) => (
                <div key={duo.rank} className="ranking-item duo-item">
                  <div className="ranking-number">{duo.rank}</div>
                  <div className="duo-players">
                    <div className="duo-player">
                      <div className="ranking-player-image">
                        <img
                          src={duo.user1.image || `https://i.pravatar.cc/150?img=${duo.user1.id}`}
                          alt={duo.user1.name}
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(duo.user1.name)}&background=2563eb&color=fff&size=128`;
                          }}
                        />
                      </div>
                      <div className="ranking-player-name">{duo.user1.name}</div>
                    </div>
                    <div className="duo-vs">VS</div>
                    <div className="duo-player">
                      <div className="ranking-player-image">
                        <img
                          src={duo.user2.image || `https://i.pravatar.cc/150?img=${duo.user2.id}`}
                          alt={duo.user2.name}
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(duo.user2.name)}&background=2563eb&color=fff&size=128`;
                          }}
                        />
                      </div>
                      <div className="ranking-player-name">{duo.user2.name}</div>
                    </div>
                  </div>
                  <div className="ranking-player-info">
                    <div className="ranking-player-stats">
                      <span className="ranking-value">
                        {duo.winRate}% ({duo.wins}W-{duo.losses}L)
                      </span>
                      <span className="ranking-games">{duo.games}GP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-message">
                {language === 'KR' ? '듀오 데이터가 없습니다.' : 'No duo data available.'}
              </div>
            </div>
          )
        ) : rankings.length > 0 ? (
          <>
            {rankings[0] && (
              <div className="top-player-card">
                <div className="top-player-image">
                  <img src={rankings[0].userImage} alt={rankings[0].userName} />
                  <div className="rank-badge">{language === 'KR' ? '1위' : '1st'}</div>
                </div>
                <div className="top-player-info">
                  <h2 className="top-player-name">{rankings[0].userName}</h2>
                  <div className="top-player-stats">
                    <div className="stat-item">
                      <span className="stat-label">{categoryInfo.label}</span>
                      <span className="stat-value">
                        {categoryInfo.unit === '%'
                          ? rankings[0].value.toFixed(1)
                          : rankings[0].value.toFixed(0)}
                        {categoryInfo.unit}
                      </span>
                    </div>
                    <div className="stat-details">
                      <span>
                        {language === 'KR' ? '경기 수' : 'Games'}: {rankings[0].gamesPlayed}
                        {language === 'KR' ? '경기' : ''}
                      </span>
                      <span>
                        {language === 'KR' ? '승률' : 'Win Rate'}:{' '}
                        {rankings[0].gamesPlayed > 0
                          ? ((rankings[0].wins / rankings[0].gamesPlayed) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1-10위 리스트 */}
            <div className="rankings-list">
              {rankings.map((player) => {
                const getRankClass = (rank) => {
                  if (rank === 1) return 'rank-gold';
                  if (rank === 2) return 'rank-silver';
                  if (rank === 3) return 'rank-bronze';
                  return '';
                };

                return (
                  <div key={player.rank} className={`ranking-item ${getRankClass(player.rank)}`}>
                    <div className="ranking-number">{player.rank}</div>
                    <div className="ranking-player-image">
                      <img
                        src={
                          player.userImage ||
                          `https://i.pravatar.cc/150?img=${player.userId || player.rank}`
                        }
                        alt={player.userName}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.userName)}&background=2563eb&color=fff&size=128`;
                        }}
                      />
                    </div>
                    <div className="ranking-player-info">
                      <div className="ranking-player-name">{player.userName}</div>
                      <div className="ranking-player-stats">
                        {selectedCategory !== 'TOTAL' && (
                          <span className="ranking-value">
                            {categoryInfo.unit === '%'
                              ? player.value.toFixed(1)
                              : player.value.toFixed(0)}
                            {categoryInfo.unit}
                          </span>
                        )}
                        <span className="ranking-games">
                          GP: {player.gamesPlayed} | W: {player.wins || 0} | L: {player.losses || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <div className="empty-message">
              {language === 'KR' ? '랭킹 데이터가 없습니다.' : 'No ranking data available.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsPage;
