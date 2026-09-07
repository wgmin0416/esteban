import { useState, useEffect } from 'react';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import './RankingsPage.scss';

const RankingsPage = () => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const language = useLanguageStore((state) => state.language);

  useEffect(() => {
    if (!teamInfo) {
      getTeamInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 랭킹 카테고리 옵션
  const categoryOptions = [
    { value: 'TOTAL', label: '종합', labelEn: 'Overall' },
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

  // RecordsPage와 동일한 더미 데이터 (기록 더미 기반으로 랭킹을 만들기 위함)
  const generateDummyRecords = () => {
    const dummyData = [];
    for (let i = 1; i <= 15; i++) {
      const gp = 20 + Math.floor(Math.random() * 15);
      const w = Math.floor(gp * (0.4 + Math.random() * 0.3));
      const l = gp - w;

      dummyData.push({
        no: i,
        userId: i,
        userName: language === 'KR' ? `선수${i}` : `Player ${i}`,
        userImage: `https://i.pravatar.cc/150?img=${i}`,
        gp,
        w,
        l,
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

  const toNumber = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const buildRankingsFromRecords = (records, category) => {
    const getValue = (r) => {
      switch (category) {
        case 'GP':
          return toNumber(r.gp);
        case 'W':
          return toNumber(r.w);
        case 'L':
          return toNumber(r.l);
        case 'POINTS':
          return toNumber(r.pts);
        case 'REBOUNDS':
          return toNumber(r.reb);
        case 'ASSISTS':
          return toNumber(r.ast);
        case 'BLOCKS':
          return toNumber(r.blk);
        case 'STEALS':
          return toNumber(r.stl);
        case 'TURNOVERS':
          return toNumber(r.turnover);
        case 'FOULS':
          return toNumber(r.pf);
        case 'FIELD_GOAL_PCT':
          return toNumber(r.fgPct);
        case 'THREE_POINTER_PCT':
          return toNumber(r.threepPct);
        case 'FREE_THROW_PCT':
          return toNumber(r.ftPct);
        case 'TOTAL': {
          // 간단한 종합 점수(임시): 득점/리바/어시/스틸/블락 가중치 + 턴오버 패널티
          const pts = toNumber(r.pts);
          const reb = toNumber(r.reb);
          const ast = toNumber(r.ast);
          const stl = toNumber(r.stl);
          const blk = toNumber(r.blk);
          const to = toNumber(r.turnover);
          return pts * 10 + reb * 7 + ast * 7 + stl * 10 + blk * 10 - to * 5;
        }
        default:
          return 0;
      }
    };

    const isLowerBetter = category === 'TURNOVERS' || category === 'FOULS';

    const mapped = records.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userImage: r.userImage,
      gamesPlayed: toNumber(r.gp),
      wins: toNumber(r.w),
      losses: toNumber(r.l),
      value: getValue(r),
    }));

    mapped.sort((a, b) => (isLowerBetter ? a.value - b.value : b.value - a.value));

    return mapped.map((p, idx) => ({
      ...p,
      rank: idx + 1,
    }));
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
        // 일반 랭킹: records(통합기록) 기반으로 랭킹 계산
        const recordsRes = await apiRequest('get', '/team/records', { year });
        const recordsData =
          recordsRes?.data && recordsRes.data.length > 0 ? recordsRes.data : generateDummyRecords();
        const computed = buildRankingsFromRecords(recordsData, category);
        setRankings(computed);
        setDuos([]);
      }
    } catch (error) {
      console.error('랭킹 로드 실패:', error);
      setDuos([]);
      setRankings([]);
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
        label: language === 'KR' ? '종합 점수' : 'Overall Score',
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
        label: language === 'KR' ? '종합 점수' : 'Overall Score',
        unit: language === 'KR' ? '점' : 'pts',
      }
    );
  };

  const categoryInfo = getCategoryInfo(selectedCategory);

  // 듀오 랭킹인 경우 1위 프로필 표시 안 함
  const isDuoRanking = selectedCategory === 'BEST_DUO' || selectedCategory === 'WORST_DUO';

  if (!teamInfo) {
    return (
      <div className="rankings-page">
        <div className="container">
          <EmptyState showActions={true} actionPath="/recruit" />
        </div>
      </div>
    );
  }

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
            {/* TOP 3: 1위 크게, 2·3위 오른쪽 절반 분할 */}
            <div className="podium">
              {[1, 2, 3].map((rank) => {
                const player = rankings.find((p) => p.rank === rank);
                if (!player) return null;

                const displayValue =
                  categoryInfo.unit === '%'
                    ? player.value.toFixed(1)
                    : player.value.toFixed(0);

                return (
                  <div key={rank} className={`podium-card rank-${rank}`}>
                    <span className="podium-rank">{rank}</span>
                    <div className="podium-avatar">
                      <img
                        src={
                          player.userImage ||
                          `https://i.pravatar.cc/150?img=${player.userId || player.rank}`
                        }
                        alt={player.userName}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            player.userName
                          )}&background=ff5a1f&color=fff&size=128`;
                        }}
                      />
                    </div>
                    <div className="podium-name">{player.userName}</div>
                    <div className="podium-value">
                      <span className="pv-num">{displayValue}</span>
                      {categoryInfo.unit && <span className="pv-unit">{categoryInfo.unit}</span>}
                    </div>
                    {rank === 1 && (
                      <div className="podium-record">
                        GP {player.gamesPlayed} · {player.wins || 0}W {player.losses || 0}L
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 4위 이하 목록 */}
            {rankings.length > 3 && (
              <div className="rankings-list">
                {rankings.slice(3).map((player) => (
                  <div key={player.rank} className="ranking-item">
                    <div className="ranking-number">{player.rank}</div>
                    <div className="ranking-player-image">
                      <img
                        src={
                          player.userImage ||
                          `https://i.pravatar.cc/150?img=${player.userId || player.rank}`
                        }
                        alt={player.userName}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.userName)}&background=ff5a1f&color=fff&size=128`;
                        }}
                      />
                    </div>
                    <div className="ranking-player-info">
                      <div className="ranking-player-name">{player.userName}</div>
                      <div className="ranking-player-stats">
                        <span className="ranking-games">
                          GP {player.gamesPlayed} · {player.wins || 0}W {player.losses || 0}L
                        </span>
                      </div>
                    </div>
                    <div className="ranking-value">
                      <span className="rv-num">
                        {categoryInfo.unit === '%'
                          ? player.value.toFixed(1)
                          : player.value.toFixed(0)}
                      </span>
                      {categoryInfo.unit && <span className="rv-unit">{categoryInfo.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
