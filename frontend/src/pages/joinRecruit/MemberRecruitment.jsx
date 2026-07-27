import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { formatDate } from '../../utils/dateUtils';
import { toastError, toastWarning } from '../../utils/alert';
import './MemberRecruitment.scss';

const MemberRecruitment = () => {
  const navigate = useNavigate();
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);

  // 게시글 로드 함수
  const loadPosts = useCallback(
    async (pageNum, query = '') => {
      if (loading) return;
      setLoading(true);

      try {
        const params = {
          page: pageNum,
          limit: 20,
        };
        if (query) {
          params.search = query;
        }

        const response = await apiRequest('get', '/member-recruitments', { params });
        if (response?.data?.recruitments) {
          const newPosts = response.data.recruitments;
          setPosts((prev) => (pageNum === 1 ? newPosts : [...prev, ...newPosts]));
          setHasMore(newPosts.length === 20);
        }
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        setPosts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

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

  const handleCreatePost = async () => {
    if (!isLogin) {
      toastWarning(language === 'KR' ? '로그인 후 이용해주세요.' : 'Please login first');
      navigate('/login');
      return;
    }

    // 글쓰기 가능한 팀 목록 확인
    try {
      const response = await apiRequest('get', '/member-recruitments/my-teams/list');
      if (response?.data && response.data.length > 0) {
        navigate('/recruit/create');
      } else {
        toastError(
          language === 'KR'
            ? '글쓰기 권한이 없습니다. 리더 또는 매니저 권한이 있는 농구팀이 필요합니다.'
            : 'You do not have permission to write. You need a basketball team with leader or manager role.'
        );
      }
    } catch (error) {
      console.error('팀 목록 조회 실패:', error);
      toastError(
        language === 'KR'
          ? '글쓰기 권한이 없습니다. 리더 또는 매니저 권한이 있는 농구팀이 필요합니다.'
          : 'You do not have permission to write. You need a basketball team with leader or manager role.'
      );
    }
  };

  const handlePostClick = (id) => {
    navigate(`/recruit/${id}`);
  };


  return (
    <div className="member-recruitment-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{language === 'KR' ? '팀원 모집' : 'Member Recruitment'}</h1>
          <button onClick={handleCreatePost} className="btn btn-primary">
            {language === 'KR' ? '+ 모집 등록' : '+ Create'}
          </button>
        </div>

        {/* 검색바 */}
        <div className="search-bar">
          <form onSubmit={handleSearch} className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={language === 'KR' ? '포지션, 장소, 내용으로 검색...' : 'Search...'}
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
              <div className="empty-message">
                {language === 'KR' ? '게시글이 없습니다.' : 'No posts available.'}
              </div>
            </div>
          ) : (
            <div className="board-list">
              {posts.map((post, index) => {
                const isLast = posts.length === index + 1;
                return (
                  <div
                    key={post.id}
                    ref={isLast ? lastPostElementRef : null}
                    className="board-item"
                    onClick={() => handlePostClick(post.id)}
                  >
                    <div className="board-item-header">
                      <div className="team-info">
                        {post.team?.logo_url && (
                          <img src={post.team.logo_url} alt={post.team.name} className="team-logo" />
                        )}
                        <h3 className="board-item-title">{post.team?.name || '팀명 없음'}</h3>
                        {post.is_competition === 1 && (
                          <span className="competition-badge">
                            {language === 'KR' ? '대회 참가' : 'Competition'}
                          </span>
                        )}
                      </div>
                      <span className="board-item-date">{formatDate(post.created_at)}</span>
                    </div>
                    <div className="board-item-content">
                      <div className="info-row">
                        <span className="info-label">📍 {language === 'KR' ? '장소' : 'Location'}</span>
                        <span>{post.location}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">⏰ {language === 'KR' ? '시간' : 'Time'}</span>
                        <span>{post.time}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">💰 {language === 'KR' ? '회비' : 'Fee'}</span>
                        <span>{post.fee.toLocaleString()}{language === 'KR' ? '원' : ' KRW'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">🏀 {language === 'KR' ? '포지션' : 'Position'}</span>
                        <span>{post.position}</span>
                      </div>
                      <div className="content-preview">
                        {post.team_intro.length > 100
                          ? `${post.team_intro.substring(0, 100)}...`
                          : post.team_intro}
                      </div>
                    </div>
                    <div className="board-item-footer">
                      <div className="board-item-meta">
                        <span>👤 {post.author?.name || '작성자'}</span>
                        <span>👁️ {post.view_count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {loading && (
            <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="end-message">
              {language === 'KR' ? '모든 게시글을 불러왔습니다.' : 'All posts loaded.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberRecruitment;
