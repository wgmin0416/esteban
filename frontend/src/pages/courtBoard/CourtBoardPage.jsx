import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { formatDate } from '../../utils/dateUtils';
import { toastWarning } from '../../utils/alert';
import './CourtBoardPage.scss';

const CourtBoardPage = () => {
  const navigate = useNavigate();
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState([]); // '대관', '양도'
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  const datePickerRef = useRef(null);

  // 지역 옵션 (인구 순서, 서울 최상단 고정)
  const regions = [
    '서울',
    '경기',
    '부산',
    '인천',
    '대구',
    '대전',
    '광주',
    '울산',
    '세종',
    '경남',
    '경북',
    '충남',
    '전남',
    '강원',
    '충북',
    '전북',
    '제주',
  ];

  // 게시글 로드 함수
  const loadPosts = useCallback(
    async (pageNum, query = '', date = null, types = [], region = '전체') => {
      if (loading) return;
      setLoading(true);

      try {
        const params = {
          page: pageNum,
          limit: 20,
        };

        // 검색어
        if (query) {
          params.search = query;
        }

        // 날짜 필터
        if (date) {
          params.date = date;
        }

        // 타입 필터 (배열로 전달)
        if (types.length > 0) {
          params.type = types;
        }

        // 지역 필터
        if (region && region !== '전체') {
          params.region = region;
        }

        const response = await apiRequest('get', '/court-boards', params);

        if (response?.success && response?.data?.boards) {
          const newPosts = response.data.boards.map((board) => {
            // 비용 표시 처리
            let costDisplay = '';
            if (board.cost === -1) {
              costDisplay = '문의';
            } else if (board.cost === 0) {
              costDisplay = '무료';
            } else {
              costDisplay = `${board.cost.toLocaleString()}원`;
            }

            // 이미지 배열 처리 (기존 단일 URL 호환성 유지)
            const images = Array.isArray(board.court_image)
              ? board.court_image
              : board.court_image
                ? [board.court_image]
                : [];

            return {
              id: board.id,
              title: board.title,
              content: board.content,
              author: board.author?.name || '알 수 없음',
              date: formatDate(board.created_at),
              courtDate: formatDate(board.court_date),
              location: board.location,
              region: board.region,
              type: board.type,
              cost: costDisplay,
              views: board.view_count || 0,
              comments: 0, // 댓글 기능이 추가되면 수정
              images: images, // 이미지 배열
            };
          });

          setPosts((prev) => (pageNum === 1 ? newPosts : [...prev, ...newPosts]));
          setHasMore(newPosts.length === 20);
        } else {
          setPosts((prev) => (pageNum === 1 ? [] : prev));
          setHasMore(false);
        }
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        setPosts((prev) => (pageNum === 1 ? [] : prev));
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // 초기 로드
  useEffect(() => {
    loadPosts(1, searchQuery, selectedDate, selectedTypes, selectedRegion);
  }, []);

  // 검색어, 날짜, 타입, 지역 변경 시 재로드
  useEffect(() => {
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, selectedDate, selectedTypes, selectedRegion);
  }, [searchQuery, selectedDate, selectedTypes, selectedRegion]);

  // 외부 클릭 시 날짜 선택기 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 무한 스크롤 옵저버
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPosts(nextPage, searchQuery, selectedDate, selectedTypes, selectedRegion);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, page, searchQuery, selectedDate, selectedTypes, selectedRegion, loadPosts]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, selectedDate, selectedTypes, selectedRegion);
  };

  const handleDateSelect = (e) => {
    const date = e.target.value;
    setSelectedDate(date || null);
    setShowDatePicker(false);
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, date || null, selectedTypes, selectedRegion);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, null, selectedTypes, selectedRegion);
  };

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value);
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, selectedDate, selectedTypes, e.target.value);
  };

  const handleCreatePost = () => {
    if (!isLogin) {
      toastWarning(language === 'KR' ? '로그인 후 이용해주세요.' : 'Please login first');
      navigate('/login');
      return;
    }
    navigate('/court-board/create');
  };

  return (
    <div className="court-board-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{language === 'KR' ? '코트대관' : 'Court Rental'}</h1>
          <button onClick={handleCreatePost} className="btn btn-primary">
            {language === 'KR' ? '+ 글쓰기' : '+ Write'}
          </button>
        </div>

        {/* 필터 섹션 */}
        <div className="filter-section">
          {/* 타입 필터 (대관/양도) */}
          <div className="filter-group">
            <span className="filter-label">{language === 'KR' ? '유형' : 'Type'}</span>
            <div className="btn-group">
              <button
                type="button"
                onClick={() => handleTypeToggle('대관')}
                className={`filter-btn filter-btn-rent ${selectedTypes.includes('대관') ? 'active' : ''}`}
              >
                {language === 'KR' ? '대관' : 'Rental'}
              </button>
              <button
                type="button"
                onClick={() => handleTypeToggle('양도')}
                className={`filter-btn filter-btn-transfer ${selectedTypes.includes('양도') ? 'active' : ''}`}
              >
                {language === 'KR' ? '양도' : 'Transfer'}
              </button>
            </div>
          </div>

          {/* 지역 필터 */}
          <div className="filter-group">
            <span className="filter-label">{language === 'KR' ? '지역' : 'Location'}</span>
            <select value={selectedRegion} onChange={handleRegionChange} className="filter-select">
              <option value="전체">{language === 'KR' ? '전체' : 'All'}</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* 날짜 필터 */}
          <div className="filter-group">
            <span className="filter-label">{language === 'KR' ? '날짜' : 'Date'}</span>
            <div className="date-filter-wrapper" ref={datePickerRef}>
              <input
                type="date"
                value={selectedDate || ''}
                onChange={handleDateSelect}
                className="filter-date"
              />
              {selectedDate && (
                <button
                  type="button"
                  className="btn btn-clear-filter"
                  onClick={clearDateFilter}
                  title={language === 'KR' ? '날짜 필터 제거' : 'Clear date filter'}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 검색바 */}
        <div className="search-form">
          <form onSubmit={handleSearch} className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={
                language === 'KR' ? '제목 또는 내용으로 검색...' : 'Search by title or content...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <button type="submit" onClick={handleSearch} className="btn btn-search">
            {language === 'KR' ? '검색' : 'Search'}
          </button>
        </div>

        {/* 게시판 */}
        <div className="board-container">
          {posts.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-message">게시글이 없습니다.</div>
            </div>
          ) : (
            <div className="board-list">
              {posts.map((post, index) => {
                if (posts.length === index + 1) {
                  return (
                    <div
                      key={post.id}
                      ref={lastPostElementRef}
                      className="board-item"
                      onClick={() => navigate(`/court-board/${post.id}`)}
                    >
                      <div className="board-item-header">
                        <h3 className="board-item-title">
                          <span
                            className={`type-badge ${post.type === '대관' ? 'rent' : 'transfer'}`}
                          >
                            {post.type}
                          </span>
                          {post.title}
                        </h3>
                        <span className="board-item-date">{post.date}</span>
                      </div>
                      {post.images && post.images.length > 0 && (
                        <div className="board-item-images">
                          {post.images.slice(0, 3).map((image, idx) => (
                            <img
                              key={idx}
                              src={image}
                              alt={`${post.title} ${idx + 1}`}
                              className="board-item-image"
                            />
                          ))}
                          {post.images.length > 3 && (
                            <div className="board-item-image-more">+{post.images.length - 3}</div>
                          )}
                        </div>
                      )}
                      <div className="board-item-content">{post.content}</div>
                      <div className="board-item-footer">
                        <div className="board-item-meta">
                          <span>👤 {post.author}</span>
                          <span>📅 {post.courtDate}</span>
                          <span>📍 {post.location}</span>
                          <span>💰 {post.cost}</span>
                          <span>👁️ {post.views}</span>
                          <span>💬 {post.comments}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={post.id}
                      className="board-item"
                      onClick={() => navigate(`/court-board/${post.id}`)}
                    >
                      <div className="board-item-header">
                        <h3 className="board-item-title">
                          <span
                            className={`type-badge ${post.type === '대관' ? 'rent' : 'transfer'}`}
                          >
                            {post.type}
                          </span>
                          {post.title}
                        </h3>
                        <span className="board-item-date">{post.date}</span>
                      </div>
                      {post.images && post.images.length > 0 && (
                        <div className="board-item-images">
                          {post.images.slice(0, 3).map((image, idx) => (
                            <img
                              key={idx}
                              src={image}
                              alt={`${post.title} ${idx + 1}`}
                              className="board-item-image"
                            />
                          ))}
                          {post.images.length > 3 && (
                            <div className="board-item-image-more">+{post.images.length - 3}</div>
                          )}
                        </div>
                      )}
                      <div className="board-item-content">{post.content}</div>
                      <div className="board-item-footer">
                        <div className="board-item-meta">
                          <span>👤 {post.author}</span>
                          <span>📅 {post.courtDate}</span>
                          <span>📍 {post.location}</span>
                          <span>💰 {post.cost}</span>
                          <span>👁️ {post.views}</span>
                          <span>💬 {post.comments}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}

          {loading && <div className="loading-spinner">로딩 중...</div>}

          {!hasMore && posts.length > 0 && (
            <div className="end-message">모든 게시글을 불러왔습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourtBoardPage;
