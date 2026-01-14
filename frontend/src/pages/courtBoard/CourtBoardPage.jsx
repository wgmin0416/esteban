import { useState, useEffect, useRef, useCallback } from 'react';
import './CourtBoardPage.scss';

const CourtBoardPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  const datePickerRef = useRef(null);

  // 더미 게시글 데이터 (실제로는 API에서 받아올 예정)
  const generateDummyPosts = (pageNum) => {
    const dummyPosts = [];
    for (let i = 0; i < 10; i++) {
      const courtDate = new Date(Date.now() + i * 86400000);
      dummyPosts.push({
        id: (pageNum - 1) * 10 + i + 1,
        title: `코트 대관/양도 게시글 ${(pageNum - 1) * 10 + i + 1}`,
        content: `이것은 코트 대관/양도 게시글 내용입니다. ${'긴 내용을 테스트하기 위한 텍스트입니다. '.repeat(5)}실제로는 API에서 받아온 데이터가 들어갈 예정입니다.`,
        author: `작성자${i + 1}`,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('ko-KR'),
        courtDate: courtDate.toLocaleDateString('ko-KR'),
        location: `체육관 ${i + 1}`,
        type: i % 2 === 0 ? '대관' : '양도',
        views: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 50),
      });
    }
    return dummyPosts;
  };

  // 게시글 로드 함수 (실제로는 API 호출)
  const loadPosts = useCallback(async (pageNum, query = '', date = null) => {
    if (loading) return;
    setLoading(true);

    // 시뮬레이션: API 호출 지연
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newPosts = generateDummyPosts(pageNum);
    
    let filtered = newPosts;
    
    if (query) {
      // 검색 필터링 (실제로는 서버에서 처리)
      filtered = filtered.filter(
        (post) =>
          post.title.includes(query) || post.content.includes(query)
      );
    }
    
    if (date) {
      // 날짜 필터링 (실제로는 서버에서 처리)
      const filterDate = new Date(date).toLocaleDateString('ko-KR');
      filtered = filtered.filter((post) => post.courtDate === filterDate);
    }
    
    setPosts((prev) => (pageNum === 1 ? filtered : [...prev, ...filtered]));
    setHasMore(filtered.length === 10);

    setLoading(false);
  }, [loading]);

  // 초기 로드
  useEffect(() => {
    loadPosts(1, searchQuery, selectedDate);
  }, []);

  // 검색어 또는 날짜 변경 시 재로드
  useEffect(() => {
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, selectedDate);
  }, [searchQuery, selectedDate]);

  // 외부 클릭 시 날짜 선택기 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
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
          loadPosts(nextPage, searchQuery, selectedDate);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, page, searchQuery, selectedDate, loadPosts]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, selectedDate);
  };

  const handleDateSelect = (e) => {
    const date = e.target.value;
    setSelectedDate(date || null);
    setShowDatePicker(false);
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, date || null);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery, null);
  };

  return (
    <div className="court-board-page">
      <div className="container">
        <h1 className="page-title">코트 대관/양도</h1>

        {/* 검색바 및 필터 */}
        <div className="search-bar">
          <form onSubmit={handleSearch} className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="제목 또는 내용으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="filter-buttons">
            <div className="date-filter-wrapper" ref={datePickerRef}>
              <button
                type="button"
                className="btn btn-date-filter"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <span className="calendar-icon">📅</span>
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('ko-KR')
                  : '날짜 선택'}
              </button>
              {selectedDate && (
                <button
                  type="button"
                  className="btn btn-clear-filter"
                  onClick={clearDateFilter}
                  title="날짜 필터 제거"
                >
                  ✕
                </button>
              )}
              {showDatePicker && (
                <div className="date-picker-dropdown">
                  <input
                    type="date"
                    value={selectedDate || ''}
                    onChange={handleDateSelect}
                    className="date-input"
                  />
                </div>
              )}
            </div>
          </div>
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
                    >
                      <div className="board-item-header">
                        <h3 className="board-item-title">
                          <span className={`type-badge ${post.type === '대관' ? 'rent' : 'transfer'}`}>
                            {post.type}
                          </span>
                          {post.title}
                        </h3>
                        <span className="board-item-date">{post.date}</span>
                      </div>
                      <div className="board-item-content">{post.content}</div>
                      <div className="board-item-footer">
                        <div className="board-item-meta">
                          <span>👤 {post.author}</span>
                          <span>📅 {post.courtDate}</span>
                          <span>📍 {post.location}</span>
                          <span>👁️ {post.views}</span>
                          <span>💬 {post.comments}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={post.id} className="board-item">
                      <div className="board-item-header">
                        <h3 className="board-item-title">
                          <span className={`type-badge ${post.type === '대관' ? 'rent' : 'transfer'}`}>
                            {post.type}
                          </span>
                          {post.title}
                        </h3>
                        <span className="board-item-date">{post.date}</span>
                      </div>
                      <div className="board-item-content">{post.content}</div>
                      <div className="board-item-footer">
                        <div className="board-item-meta">
                          <span>👤 {post.author}</span>
                          <span>📅 {post.courtDate}</span>
                          <span>📍 {post.location}</span>
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

          {loading && (
            <div className="loading-spinner">로딩 중...</div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="end-message">모든 게시글을 불러왔습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourtBoardPage;
