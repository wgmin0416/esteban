import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import { BOARD_CATEGORIES, categoryColor, roleBadge } from './boardConstants';
import './BoardPage.scss';

const pad = (n) => String(n).padStart(2, '0');
// 목록 날짜: 09. 15.
const fmtListDate = (d) => {
  const x = new Date(d);
  return `${pad(x.getMonth() + 1)}. ${pad(x.getDate())}.`;
};

// 오늘(로컬 기준) 작성된 글인지
const isToday = (d) => {
  if (!d) return false;
  const x = new Date(d);
  const n = new Date();
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
};

const BoardPage = () => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const language = useLanguageStore((state) => state.language);
  const navigate = useNavigate();
  const t = (kr, en) => (language === 'KR' ? kr : en);

  useEffect(() => {
    if (!teamInfo) getTeamInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState(''); // '' = 전체
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadBoards = async (pageNum = 1, search = '', cat = '') => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 20, search };
      if (cat) params.category = cat;
      const response = await apiRequest('get', '/team/boards', params);
      if (response?.data) {
        setBoards(response.data);
        setTotalPages(response.totalPages || 1);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  // 공지사항 상단 고정
  const sortedBoards = useMemo(
    () => [...boards].sort((a, b) => (b.is_notice ? 1 : 0) - (a.is_notice ? 1 : 0)),
    [boards]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    loadBoards(1, searchQuery, category);
  };

  const handleCategory = (cat) => {
    setCategory(cat);
    loadBoards(1, searchQuery, cat);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadBoards(newPage, searchQuery, category);
    }
  };

  if (!teamInfo) {
    return (
      <div className="board-page">
        <div className="container">
          <EmptyState showActions={true} actionPath="/recruit" />
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      <div className="container">
        <h1 className="page-title">
          {t('게시판', 'Board')}
          <span className="page-subtitle">{t('팀 소식 · 공지', 'Team news & notices')}</span>
        </h1>

        {/* 검색 및 작성 버튼 */}
        <div className="board-header">
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder={t('검색...', 'Search...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-search">{t('검색', 'Search')}</button>
          </form>
          <button onClick={() => navigate('/locker-room/team-board/write')} className="btn btn-primary">
            {t('글쓰기', 'Write')}
          </button>
        </div>

        {/* 말머리 필터 */}
        <div className="cat-filter">
          <button className={`cf-chip ${category === '' ? 'active' : ''}`} onClick={() => handleCategory('')}>
            {t('전체', 'All')}
          </button>
          {BOARD_CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`cf-chip ${category === c.value ? 'active' : ''}`}
              style={category === c.value ? { background: c.color, borderColor: c.color, color: '#fff' } : undefined}
              onClick={() => handleCategory(c.value)}
            >
              {c.value}
            </button>
          ))}
        </div>

        {/* 게시글 목록 */}
        {loading ? (
          <div className="loading-spinner">{t('로딩 중...', 'Loading...')}</div>
        ) : boards.length > 0 ? (
          <div className="board-table-container">
            <table className="board-table">
              <tbody>
                {sortedBoards.map((board) => {
                  const badge = roleBadge(board.authorRole);
                  return (
                    <tr
                      key={board.id}
                      className={board.is_notice ? 'notice' : ''}
                      onClick={() => navigate(`/locker-room/team-board/${board.id}`)}
                    >
                      <td className="col-cat">
                        <span className="cat-badge" style={{ background: categoryColor(board.category) }}>
                          {board.category}
                        </span>
                      </td>
                      <td className="col-title">
                        <div className="title-cell">
                          <span className="board-title">{board.title}</span>
                          {isToday(board.created_at) && <span className="cnt new">NEW</span>}
                          {!!board.pinned_home && <span className="cnt home">🏠 {t('홈', 'Home')}</span>}
                          {board.commentCount > 0 && <span className="cnt cmt">💬 {board.commentCount}</span>}
                        </div>
                        <div className="title-sub">
                          <span className="ts-item">{fmtListDate(board.created_at)}</span>
                          <span className="ts-item">{t('조회', 'views')} {board.view_count}</span>
                        </div>
                      </td>
                      <td className="col-author">
                        <span className="ca-name">{board.author?.name}</span>
                        {badge && <span className={`role-badge ${badge.cls}`}>{badge.label}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-message">{t('게시글이 없습니다.', 'No posts available.')}</div>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="btn btn-page">
              {t('이전', 'Prev')}
            </button>
            <span className="page-info">{page} / {totalPages}</span>
            <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="btn btn-page">
              {t('다음', 'Next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardPage;
