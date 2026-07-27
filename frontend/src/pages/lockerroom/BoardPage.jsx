import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import EmptyState from '../../components/common/EmptyState';
import { toastSuccess, toastError, confirm } from '../../utils/alert';
import './BoardPage.scss';

const BoardPage = () => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const language = useLanguageStore((state) => state.language);
  const navigate = useNavigate();

  useEffect(() => {
    if (!teamInfo) {
      getTeamInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(null);

  // 게시글 폼 상태
  const [form, setForm] = useState({
    title: '',
    content: '',
    is_notice: false,
  });

  // 게시글 목록 로드
  const loadBoards = async (pageNum = 1, search = '') => {
    setLoading(true);
    try {
      const response = await apiRequest('get', '/team/boards', {
        page: pageNum,
        limit: 20,
        search,
      });

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

  const handleSearch = (e) => {
    e.preventDefault();
    loadBoards(1, searchQuery);
  };

  const handleWriteClick = () => {
    setForm({ title: '', content: '', is_notice: false });
    setSelectedBoard(null);
    setShowWriteModal(true);
  };

  const handleEditClick = async (boardId) => {
    try {
      const response = await apiRequest('get', `/team/boards/${boardId}`);
      if (response?.data) {
        setForm({
          title: response.data.title,
          content: response.data.content,
          is_notice: response.data.is_notice === 1,
        });
        setSelectedBoard(response.data);
        setShowWriteModal(true);
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
    }
  };

  const handleDelete = async (boardId) => {
    const result = await confirm(language === 'KR' ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete?');
    if (!result) {
      return;
    }

    try {
      const response = await apiRequest('delete', `/team/boards/${boardId}`);
      if (response?.success) {
        toastSuccess(language === 'KR' ? '삭제되었습니다.' : 'Deleted successfully');
        loadBoards(page, searchQuery);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      toastError(language === 'KR' ? '삭제 중 오류가 발생했습니다.' : 'Failed to delete');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || !form.content) {
      toastError(language === 'KR' ? '제목과 내용을 입력해주세요.' : 'Please enter title and content');
      return;
    }

    try {
      const method = selectedBoard ? 'put' : 'post';
      const url = selectedBoard ? `/team/boards/${selectedBoard.id}` : '/team/boards';

      const response = await apiRequest(method, url, form);

      if (response?.success) {
        toastSuccess(response.message || (language === 'KR' ? '저장되었습니다.' : 'Saved successfully'));
        setShowWriteModal(false);
        loadBoards(page, searchQuery);
      }
    } catch (error) {
      console.error('저장 실패:', error);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadBoards(newPage, searchQuery);
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
        <h1 className="page-title">{language === 'KR' ? '게시판' : 'Board'}</h1>

        {/* 검색 및 작성 버튼 */}
        <div className="board-header">
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder={language === 'KR' ? '검색...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-search">
              {language === 'KR' ? '검색' : 'Search'}
            </button>
          </form>
          <button onClick={handleWriteClick} className="btn btn-primary">
            {language === 'KR' ? '글쓰기' : 'Write'}
          </button>
        </div>

        {/* 게시글 목록 */}
        {loading ? (
          <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
        ) : boards.length > 0 ? (
          <div className="board-list">
            {boards.map((board) => (
              <div key={board.id} className={`board-item ${board.is_notice ? 'notice' : ''}`}>
                <div className="board-main">
                  {board.is_notice && (
                    <span className="notice-badge">
                      {language === 'KR' ? '공지' : 'Notice'}
                    </span>
                  )}
                  <h3 className="board-title">{board.title}</h3>
                  <p className="board-content">{board.content}</p>
                  <div className="board-meta">
                    <span className="author">{board.author?.name}</span>
                    <span className="date">
                      {new Date(board.created_at).toLocaleDateString(
                        language === 'KR' ? 'ko-KR' : 'en-US'
                      )}
                    </span>
                    <span className="views">
                      {language === 'KR' ? '조회' : 'Views'} {board.view_count}
                    </span>
                  </div>
                </div>
                <div className="board-actions">
                  <button onClick={() => handleEditClick(board.id)} className="btn btn-sm btn-edit">
                    {language === 'KR' ? '수정' : 'Edit'}
                  </button>
                  <button onClick={() => handleDelete(board.id)} className="btn btn-sm btn-delete">
                    {language === 'KR' ? '삭제' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-message">
              {language === 'KR' ? '게시글이 없습니다.' : 'No posts available.'}
            </div>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="btn btn-page"
            >
              {language === 'KR' ? '이전' : 'Prev'}
            </button>
            <span className="page-info">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="btn btn-page"
            >
              {language === 'KR' ? '다음' : 'Next'}
            </button>
          </div>
        )}
      </div>

      {/* 글쓰기/수정 모달 */}
      {showWriteModal && (
        <div className="modal-overlay" onClick={() => setShowWriteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedBoard ? (language === 'KR' ? '게시글 수정' : 'Edit Post') : (language === 'KR' ? '게시글 작성' : 'Write Post')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_notice}
                    onChange={(e) => setForm({ ...form, is_notice: e.target.checked })}
                  />
                  {language === 'KR' ? ' 공지사항' : ' Notice'}
                </label>
              </div>
              <div className="form-group">
                <label>{language === 'KR' ? '제목' : 'Title'}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={language === 'KR' ? '제목을 입력하세요' : 'Enter title'}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>{language === 'KR' ? '내용' : 'Content'}</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={language === 'KR' ? '내용을 입력하세요' : 'Enter content'}
                  className="form-textarea"
                  rows={10}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowWriteModal(false)} className="btn btn-secondary">
                  {language === 'KR' ? '취소' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'KR' ? '저장' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
