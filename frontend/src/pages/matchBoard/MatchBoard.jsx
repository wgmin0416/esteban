import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { formatMatchDateTime } from '../../utils/dateUtils';
import { toastWarning } from '../../utils/alert';
import './MatchBoard.scss';

const MatchBoardPage = () => {
  const navigate = useNavigate();
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  // 지역 옵션
  const locations = ['서울', '강남', '신촌', '홍대', '잠실', '수원', '인천', '부천'];

  // 더미 데이터 생성
  const generateDummyBoards = () => {
    const types = ['team', 'guest', 'pickup'];
    const teamNames = ['레드팀', '블루팀', '그린팀', '옐로우팀'];

    return Array.from({ length: 15 }, (_, i) => {
      const type = types[i % 3];
      const matchStart = new Date(Date.now() + (i + 1) * 86400000);
      const matchEnd = new Date(matchStart.getTime() + 2 * 60 * 60 * 1000);
      const maxParticipants = ((i % 3) + 2) * 5;
      const currentParticipants = Math.floor(Math.random() * (maxParticipants + 1));

      return {
        id: i + 1,
        type,
        team_name: type !== 'pickup' ? teamNames[i % 4] : null,
        match_start_time: matchStart.toISOString(),
        match_end_time: matchEnd.toISOString(),
        location: `${locations[i % 8]} 체육관`,
        location_region: locations[i % 8],
        cost: (i + 1) * 10000,
        skill_level: type !== 'pickup' ? ['중상', '중', '중하'][i % 3] : null,
        game_format: '10분 4쿼터 3게임',
        uniform: '빨강/검정',
        max_participants: maxParticipants,
        current_participants: currentParticipants,
        has_parking: i % 2 === 0,
        has_air_conditioning: i % 3 === 0,
        has_shower: i % 2 === 1,
        description: `경기 모집합니다. 연락 주세요! ${i + 1}`,
        view_count: Math.floor(Math.random() * 100),
        is_liked: false,
        status: currentParticipants >= maxParticipants ? 'closed' : 'open',
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        author: {
          id: 1,
          name: `작성자${i + 1}`,
          profile_image: null,
        },
      };
    });
  };

  // 게시글 로드
  const loadBoards = async () => {
    setLoading(true);
    try {
      const dummyData = generateDummyBoards();
      setBoards(dummyData);
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      setBoards(generateDummyBoards());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, [statusFilter, selectedTypes, selectedDate, selectedLocation]);

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadBoards();
  };

  const handleCreatePost = () => {
    if (!isLogin) {
      toastWarning(language === 'KR' ? '로그인 후 이용해주세요.' : 'Please login first');
      return;
    }
    navigate('/match-board/create');
  };

  const handleBoardClick = (id) => {
    navigate(`/match-board/${id}`);
  };

  const handleLike = async (boardId, e) => {
    e.stopPropagation();
    if (!isLogin) {
      toastWarning(language === 'KR' ? '로그인 후 이용해주세요.' : 'Please login first');
      return;
    }
    // TODO: API 연결
    setBoards((prev) =>
      prev.map((board) => (board.id === boardId ? { ...board, is_liked: !board.is_liked } : board))
    );
  };

  const getTypeLabel = (type) => {
    const labels = {
      team: language === 'KR' ? '팀 초청' : 'Team',
      guest: language === 'KR' ? '게스트' : 'Guest',
      pickup: language === 'KR' ? '픽업' : 'Pickup',
    };
    return labels[type] || type;
  };

  return (
    <div className="match-board-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{language === 'KR' ? '경기 모집' : 'Match Recruitment'}</h1>
          <button onClick={handleCreatePost} className="btn btn-primary">
            {language === 'KR' ? '+ 모집 등록' : '+ Create'}
          </button>
        </div>

        {/* 필터 버튼 */}
        <div className="filter-section">
          {/* 타입 필터 (OR 조건) */}
          <div className="filter-group">
            <span className="filter-label">{language === 'KR' ? '유형' : 'Type'}</span>
            <div className="btn-group">
              {['team', 'guest', 'pickup'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  className={`filter-btn filter-btn-${type} ${selectedTypes.includes(type) ? 'active' : ''}`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* 모집 상태 */}
          <div className="filter-group">
            <span className="filter-label">{language === 'KR' ? '상태' : 'Status'}</span>
            <div className="btn-group">
              <button
                onClick={() => setStatusFilter('open')}
                className={`filter-btn ${statusFilter === 'open' ? 'active' : ''}`}
              >
                {language === 'KR' ? '모집중' : 'Open'}
              </button>
              <button
                onClick={() => setStatusFilter('closed')}
                className={`filter-btn ${statusFilter === 'closed' ? 'active' : ''}`}
              >
                {language === 'KR' ? '마감' : 'Closed'}
              </button>
            </div>
          </div>

          {/* 지역 필터 */}
          <div className="filter-group">
            <span className="filter-label">{language === 'KR' ? '지역' : 'Location'}</span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="filter-select"
            >
              <option value="">{language === 'KR' ? '전체' : 'All'}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* 날짜 필터 */}
          <div className="filter-group">
            <span className="filter-label">{language === 'KR' ? '날짜' : 'Date'}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-date"
            />
          </div>
        </div>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'KR' ? '제목, 내용, 작성자 검색...' : 'Search...'}
            className="search-input"
          />
          <button type="submit" className="btn btn-search">
            🔍
          </button>
        </form>

        {/* 게시글 목록 */}
        {loading ? (
          <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            {language === 'KR' ? '게시글이 없습니다.' : 'No posts available.'}
          </div>
        ) : (
          <div className="board-list">
            {boards.map((board) => (
              <div
                key={board.id}
                className={`board-item board-item-${board.type}`}
                onClick={() => handleBoardClick(board.id)}
              >
                {/* 좌측: 경기 정보 */}
                <div className="board-main">
                  <div className="board-top">
                    <span className={`type-badge type-${board.type}`}>
                      {getTypeLabel(board.type)}
                    </span>
                    <span className="match-date">
                      {formatMatchDateTime(board.match_start_time)}
                    </span>
                  </div>

                  <h3 className="board-title">
                    {board.team_name || (language === 'KR' ? '픽업 게임' : 'Pickup Game')}
                  </h3>

                  <div className="board-info">
                    <span className="location">📍 {board.location_region}</span>
                    <span className="cost">
                      💰 {board.cost.toLocaleString()}
                      {language === 'KR' ? '원' : 'KRW'}
                    </span>
                    {board.skill_level && <span className="skill">🏀 {board.skill_level}</span>}
                  </div>
                </div>

                {/* 우측: 인원/액션 */}
                <div className="board-right">
                  <div className="participants">
                    <span className="count">
                      {board.current_participants}/{board.max_participants}
                    </span>
                    <span className="label">{language === 'KR' ? '명' : ''}</span>
                  </div>

                  <div className="board-actions">
                    <button
                      onClick={(e) => handleLike(board.id, e)}
                      className={`btn-icon ${board.is_liked ? 'liked' : ''}`}
                      title={language === 'KR' ? '찜하기' : 'Like'}
                    >
                      {board.is_liked ? '❤️' : '🤍'}
                    </button>
                    <span className="views">👁️ {board.view_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchBoardPage;
