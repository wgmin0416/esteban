import { useState, useEffect, useMemo } from 'react';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import './RankingsPage.scss';

const MIN_GAMES = 20; // 랭킹 자격: 누적 경기 수 이상
const MIN_3PA = 20; // 3점 성공률 랭킹 자격: (선택 기간) 3점 시도 수 이상
const MIN_FTA = 10; // 자유투 성공률 랭킹 자격: (선택 기간) 자유투 시도 수 이상
// 종합 점수 = PIE(개인 임팩트) + 승률(승 기여) 정규화 가중합 (지분 조절용, 합 100%)
const PIE_WEIGHT = 70;
const WIN_WEIGHT = 30;

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
        default:
          return 0;
      }
    };

    const isLowerBetter = category === 'TURNOVERS' || category === 'FOULS';

    // 자격 충족 선수만
    const qualified = records
      .filter((r) => toNumber(r.gp) >= MIN_GAMES) // 경기 수 자격
      // 슈팅 성공률은 (선택 기간) 최소 시도 수 충족만 — 소량 시도 100% 배제
      .filter((r) => category !== 'THREE_POINTER_PCT' || toNumber(r.threepa) >= MIN_3PA)
      .filter((r) => category !== 'FREE_THROW_PCT' || toNumber(r.fta) >= MIN_FTA);

    // 종합(TOTAL): PIE·승률을 자격자 내에서 0~100 정규화 후 가중합
    const winRateOf = (r) => (toNumber(r.gp) > 0 ? (toNumber(r.w) / toNumber(r.gp)) * 100 : 0);
    let pieRange = [0, 0];
    let winRange = [0, 0];
    if (category === 'TOTAL' && qualified.length) {
      const pies = qualified.map((r) => toNumber(r.pie));
      const wins = qualified.map(winRateOf);
      pieRange = [Math.min(...pies), Math.max(...pies)];
      winRange = [Math.min(...wins), Math.max(...wins)];
    }
    const norm = (x, [mn, mx]) => (mx > mn ? ((x - mn) / (mx - mn)) * 100 : 50);
    const valueOf = (r) => {
      if (category === 'TOTAL') {
        return (
          (PIE_WEIGHT * norm(toNumber(r.pie), pieRange) +
            WIN_WEIGHT * norm(winRateOf(r), winRange)) /
          100
        );
      }
      return getValue(r);
    };

    const mapped = qualified.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userImage: r.userImage,
      gamesPlayed: toNumber(r.gp),
      wins: toNumber(r.w),
      losses: toNumber(r.l),
      value: valueOf(r),
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
  }, [selectedYear, teamInfo]);

  // 항목 전환은 재요청 없이 클라이언트 재정렬만
  const rankings = useMemo(
    () => buildRankingsFromRecords(records, selectedCategory),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, selectedCategory]
  );

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
        label: language === 'KR' ? '종합 점수' : 'Overall',
        unit: language === 'KR' ? '점' : '',
        decimals: 1,
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

  const duoFace = (u) =>
    u?.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || '?')}&background=ff5a1f&color=fff&size=96`;

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

        {/* 듀오 랭킹 (최고/최악 좌우 2열, 전체 표시) */}
        {(bestDuos.length > 0 || worstDuos.length > 0) && (
          <div className="duo-columns">
            {[
              { cls: 'best', cap: language === 'KR' ? '🔥 최고의 듀오' : '🔥 Best Duo', list: bestDuos },
              { cls: 'worst', cap: language === 'KR' ? '💧 최악의 듀오' : '💧 Worst Duo', list: worstDuos },
            ].map((col) => (
              <div key={col.cls} className={`duo-col ${col.cls}`}>
                <div className="dc-title">{col.cap}</div>
                {col.list.length > 0 ? (
                  <ol className="dc-list">
                    {col.list.slice(0, 3).map((duo, i) => (
                      <li key={i} className="dc-item">
                        <span className="dc-rank">{i + 1}</span>
                        <div className="dc-faces">
                          <img src={duoFace(duo.user1)} alt={duo.user1?.name} />
                          <img src={duoFace(duo.user2)} alt={duo.user2?.name} />
                        </div>
                        <div className="dc-info">
                          <span className="dc-names">{duo.user1?.name} · {duo.user2?.name}</span>
                          <span className="dc-sub">
                            {duo.wins}{language === 'KR' ? '승' : 'W'} {duo.losses}{language === 'KR' ? '패' : 'L'}
                            {duo.minutes ? ` · ${duo.minutes}${language === 'KR' ? '분' : 'min'}` : ''}
                            {duo.assists > 0 ? ` · ${language === 'KR' ? '어시' : 'AST'} ${duo.assists}` : ''}
                          </span>
                        </div>
                        <span className="dc-rate">{duo.winRate}%</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="dc-empty">-</div>
                )}
              </div>
            ))}
          </div>
        )}

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

        {selectedCategory === 'TOTAL' && (
          <p className="rankings-note">
            {language === 'KR'
              ? `※ 종합 = PIE(임팩트) ${PIE_WEIGHT}% + 승률 ${WIN_WEIGHT}% (자격자 내 정규화)`
              : `※ Overall = PIE ${PIE_WEIGHT}% + Win% ${WIN_WEIGHT}% (normalized)`}
          </p>
        )}
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

        {/* 1위 선수 프로필 (항목별) */}
        {loading ? (
          <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
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
