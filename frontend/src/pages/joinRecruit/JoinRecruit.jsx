import { useState, useEffect, useRef, useCallback } from 'react';
import './JoinRecruit.scss';

const JoinRecruitPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);

  // 더미 게시글 데이터 (실제로는 API에서 받아올 예정)
  const generateDummyPosts = (pageNum) => {
    const dummyPosts = [];
    for (let i = 0; i < 10; i++) {
      dummyPosts.push({
        id: (pageNum - 1) * 10 + i + 1,
        title: `팀/팀원 찾기 게시글 ${(pageNum - 1) * 10 + i + 1}`,
        content: `이것은 게시글 내용입니다. ${'긴 내용을 테스트하기 위한 텍스트입니다. '.repeat(5)}실제로는 API에서 받아온 데이터가 들어갈 예정입니다.`,
        author: `작성자${i + 1}`,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('ko-KR'),
        views: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 50),
      });
    }
    return dummyPosts;
  };

  // 게시글 로드 함수 (실제로는 API 호출)
  const loadPosts = useCallback(async (pageNum, query = '') => {
    if (loading) return;
    setLoading(true);

    // 시뮬레이션: API 호출 지연
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newPosts = generateDummyPosts(pageNum);
    
    if (query) {
      // 검색 필터링 (실제로는 서버에서 처리)
      const filtered = newPosts.filter(
        (post) =>
          post.title.includes(query) || post.content.includes(query)
      );
      setPosts((prev) => (pageNum === 1 ? filtered : [...prev, ...filtered]));
      setHasMore(filtered.length === 10);
    } else {
      setPosts((prev) => (pageNum === 1 ? newPosts : [...prev, ...newPosts]));
      setHasMore(newPosts.length === 10);
    }

    setLoading(false);
  }, [loading]);

  // 초기 로드
  useEffect(() => {
    loadPosts(1, searchQuery);
  }, []);

  // 검색어 변경 시 재로드
  useEffect(() => {
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery);
  }, [searchQuery]);

  // 무한 스크롤 옵저버
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPosts(nextPage, searchQuery);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, page, searchQuery, loadPosts]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setPosts([]);
    loadPosts(1, searchQuery);
  };

  return (
    <div className="join-recruit-page">
      <div className="container">
        <h1 className="page-title">팀/팀원 찾기</h1>

        {/* 검색바 */}
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
                        <h3 className="board-item-title">{post.title}</h3>
                        <span className="board-item-date">{post.date}</span>
                      </div>
                      <div className="board-item-content">{post.content}</div>
                      <div className="board-item-footer">
                        <div className="board-item-meta">
                          <span>👤 {post.author}</span>
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
                        <h3 className="board-item-title">{post.title}</h3>
                        <span className="board-item-date">{post.date}</span>
                      </div>
                      <div className="board-item-content">{post.content}</div>
                      <div className="board-item-footer">
                        <div className="board-item-meta">
                          <span>👤 {post.author}</span>
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

export default JoinRecruitPage;
