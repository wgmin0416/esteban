import { useState, useEffect, useMemo } from 'react';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import './RankingsPage.scss';

const MIN_GAMES = 20; // 랭킹 자격: 누적 경기 수 이상
const MIN_3PA = 20; // 3점 성공률 랭킹 자격: (선택 기간) 3점 시도 수 이상
const MIN_FTA = 10; // 자유투 성공률 랭킹 자격: (선택 기간) 자유투 시도 수 이상

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
    { value: 'BEST_DUO', label: '최고의 듀오', labelEn: 'Best Duo' },
    { value: 'WORST_DUO', label: '최악의 듀오', labelEn: 'Worst Duo' },
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
    { value: 'PLUS_MINUS', label: '득실 마진(+/-)', labelEn: '+/-' },
    { value: 'TS_PCT', label: '실득점 효율(TS%)', labelEn: 'TS%' },
    { value: 'EFG_PCT', label: '유효 야투율(eFG%)', labelEn: 'eFG%' },
    { value: 'GAME_SCORE', label: '게임 스코어', labelEn: 'GmSc' },
    { value: 'EFF', label: '효율(EFF)', labelEn: 'EFF' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('TOTAL');
  const [selectedYear, setSelectedYear] = useState('ALL'); // 'ALL' = 전체 누적(기본)
  const [availableYears, setAvailableYears] = useState([]);
  const [records, setRecords] = useState([]); // 기간별 원시 집계(항목과 무관) — 캐싱용
  const [bestDuos, setBestDuos] = useState([]); // 최고 듀오 전체(<=10)
  const [worstDuos, setWorstDuos] = useState([]); // 최악 듀오 전체(<=10)
  const [duoIdx, setDuoIdx] = useState(0); // 하이라이트 순환 인덱스(TOP3)
  const [loading, setLoading] = useState(false);

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
        case 'PLUS_MINUS':
          return toNumber(r.pmPerGame);
        case 'TS_PCT':
          return toNumber(r.tsPct);
        case 'EFG_PCT':
          return toNumber(r.efgPct);
        case 'GAME_SCORE':
          return toNumber(r.gameScore);
        case 'EFF':
          return toNumber(r.eff);
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

    const mapped = records
      .filter((r) => toNumber(r.gp) >= MIN_GAMES) // 경기 수 자격
      // 슈팅 성공률은 (선택 기간) 최소 시도 수 충족만 — 소량 시도 100% 배제
      .filter((r) => category !== 'THREE_POINTER_PCT' || toNumber(r.threepa) >= MIN_3PA)
      .filter((r) => category !== 'FREE_THROW_PCT' || toNumber(r.fta) >= MIN_FTA)
      .map((r) => ({
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

  // 기간별 데이터 로드 (항목과 무관) — 기록 집계 + 듀오(최고/최악)를 한 번씩만.
  // year='ALL'이면 전체 누적, 아니면 해당 연도. 항목 전환 시엔 재요청하지 않고 클라이언트에서 재정렬.
  const loadPeriod = async (year) => {
    setLoading(true);
    const period = year && year !== 'ALL' ? { year } : {};
    try {
      const [rec, b, w] = await Promise.all([
        apiRequest('get', '/team/records', { ...period }),
        apiRequest('get', '/team/rankings/duos', { type: 'best', ...period }),
        apiRequest('get', '/team/rankings/duos', { type: 'worst', ...period }),
      ]);
      setRecords(rec?.data || []);
      setBestDuos(b?.data || []);
      setWorstDuos(w?.data || []);
    } catch (error) {
      console.error('랭킹 로드 실패:', error);
      setRecords([]);
      setBestDuos([]);
      setWorstDuos([]);
    } finally {
      setLoading(false);
    }
  };

  // 조회 가능한 연도 목록
  const loadAvailableYears = async () => {
    try {
      const response = await apiRequest('get', '/team/rankings/years');
      setAvailableYears(response?.data?.length ? response.data : [new Date().getFullYear()]);
    } catch {
      setAvailableYears([new Date().getFullYear()]);
    }
  };

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (teamInfo?.id) loadPeriod(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, teamInfo]);

  // 매일 다른 듀오가 먼저 뜨도록 날짜 기반 시작 + 4초마다 자동 순환(TOP3)
  useEffect(() => {
    const len = Math.min(3, Math.max(bestDuos.length, worstDuos.length));
    if (len <= 1) {
      setDuoIdx(0);
      return;
    }
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    setDuoIdx(dayOfYear % len);
    const timer = setInterval(() => setDuoIdx((i) => (i + 1) % len), 4000);
    return () => clearInterval(timer);
  }, [bestDuos, worstDuos]);

  // 항목 전환은 재요청 없이 클라이언트 재정렬/선택만
  const isDuoRanking = selectedCategory === 'BEST_DUO' || selectedCategory === 'WORST_DUO';
  const rankings = useMemo(
    () => (isDuoRanking ? [] : buildRankingsFromRecords(records, selectedCategory)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, selectedCategory]
  );
  const duos = selectedCategory === 'BEST_DUO' ? bestDuos : selectedCategory === 'WORST_DUO' ? worstDuos : [];

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value); // 'ALL' 또는 '2026' 등
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
      PLUS_MINUS: {
        label: language === 'KR' ? '경기당 득실(+/-)' : '+/- per game',
        unit: '',
        decimals: 1,
        signed: true,
      },
      TS_PCT: { label: language === 'KR' ? '실득점 효율(TS%)' : 'TS%', unit: '%' },
      EFG_PCT: { label: language === 'KR' ? '유효 야투율(eFG%)' : 'eFG%', unit: '%' },
      GAME_SCORE: { label: language === 'KR' ? '게임 스코어' : 'Game Score', unit: '', decimals: 1 },
      EFF: { label: language === 'KR' ? '효율(EFF)' : 'EFF', unit: '', decimals: 1 },
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

  // 값 표시(소수 자리수 + 양수 부호)
  const formatValue = (v, info) => {
    const d = info.decimals ?? (info.unit === '%' ? 1 : 0);
    const s = Number(v).toFixed(d);
    return info.signed && Number(v) > 0 ? `+${s}` : s;
  };

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
            {language === 'KR' ? '(경기 수 20회 이상)' : '(20+ games played)'}
          </span>
        </h1>

        {/* 듀오 하이라이트 (최고/최악 TOP3 순환) */}
        {(bestDuos.length > 0 || worstDuos.length > 0) &&
          (() => {
            const bestTop = bestDuos.slice(0, 3);
            const worstTop = worstDuos.slice(0, 3);
            const len = Math.max(bestTop.length, worstTop.length);
            const bd = bestTop[duoIdx] || bestTop[0];
            const wd = worstTop[duoIdx] || worstTop[0];
            const face = (u) =>
              u?.image ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || '?')}&background=ff5a1f&color=fff&size=96`;
            const renderSide = (duo, cls, cap, cat) =>
              duo ? (
                <button className={`dh-side ${cls}`} onClick={() => setSelectedCategory(cat)}>
                  <span className="dh-cap">{cap}</span>
                  <div className="dh-faces">
                    <img src={face(duo.user1)} alt={duo.user1?.name} />
                    <img src={face(duo.user2)} alt={duo.user2?.name} />
                  </div>
                  <div className="dh-names">{duo.user1?.name} · {duo.user2?.name}</div>
                  <div className="dh-stat">
                    {duo.winRate}% <em>{duo.wins}{language === 'KR' ? '승' : 'W'} {duo.losses}{language === 'KR' ? '패' : 'L'} · {language === 'KR' ? '마진' : '+/-'} {duo.pmPerGame > 0 ? `+${duo.pmPerGame}` : duo.pmPerGame}</em>
                  </div>
                </button>
              ) : (
                <div className={`dh-side ${cls} empty`}>
                  <span className="dh-cap">{cap}</span>
                  <span className="dh-none">-</span>
                </div>
              );
            return (
              <div className="duo-highlight">
                <div className="dh-row">
                  {renderSide(bd, 'best', language === 'KR' ? '🔥 최고의 듀오' : '🔥 Best Duo', 'BEST_DUO')}
                  {renderSide(wd, 'worst', language === 'KR' ? '💧 최악의 듀오' : '💧 Worst Duo', 'WORST_DUO')}
                </div>
                {len > 1 && (
                  <div className="dh-dots">
                    {Array.from({ length: len }).map((_, i) => (
                      <span
                        key={i}
                        className={i === duoIdx ? 'on' : ''}
                        onClick={() => setDuoIdx(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

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
            <label htmlFor="year-select">{language === 'KR' ? '기간' : 'Period'}</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              className="filter-select"
            >
              <option value="ALL">{language === 'KR' ? '전체' : 'All-time'}</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {language === 'KR' ? `${year}년` : `${year}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCategory === 'THREE_POINTER_PCT' && (
          <p className="rankings-note">
            {language === 'KR'
              ? `※ 3점 시도 ${MIN_3PA}개 이상만 집계 (선택 기간 기준)`
              : `※ Min. ${MIN_3PA} 3PT attempts (selected period)`}
          </p>
        )}
        {selectedCategory === 'FREE_THROW_PCT' && (
          <p className="rankings-note">
            {language === 'KR'
              ? `※ 자유투 시도 ${MIN_FTA}개 이상만 집계 (선택 기간 기준)`
              : `※ Min. ${MIN_FTA} FT attempts (selected period)`}
          </p>
        )}

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
                      <span className="ranking-games">
                        {duo.games}GP · {language === 'KR' ? '마진' : '+/-'} {duo.pmPerGame > 0 ? `+${duo.pmPerGame}` : duo.pmPerGame}
                      </span>
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

                const displayValue = formatValue(player.value, categoryInfo);

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
                      <span className="rv-num">{formatValue(player.value, categoryInfo)}</span>
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
              {language === 'KR'
                ? '아직 랭킹이 없습니다. (누적 20경기 이상인 선수부터 집계)'
                : 'No rankings yet. (Players with 20+ games qualify)'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsPage;
