import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess, confirm } from '../../utils/alert';
import './CourtBoardDetail.scss';

const CourtBoardDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const myInfo = useAuthStore((state) => state.myInfo);
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadBoard();
  }, [id]);

  // 키보드 이벤트 (ESC로 닫기, 좌우 화살표로 이미지 이동)
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        const currentIndex = images.indexOf(selectedImage);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
        setSelectedImage(images[prevIndex]);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        const currentIndex = images.indexOf(selectedImage);
        const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
        setSelectedImage(images[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, images]);

  const loadBoard = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('get', `/court-boards/${id}`);
      if (response?.data?.board) {
        setBoard(response.data.board);
      } else {
        toastError(language === 'KR' ? '게시글을 찾을 수 없습니다.' : 'Post not found');
        navigate('/court-board');
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      toastError(language === 'KR' ? '게시글을 불러올 수 없습니다.' : 'Failed to load post');
      navigate('/court-board');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/court-board/edit/${id}`);
  };

  const handleDelete = async () => {
    const result = await confirm(
      language === 'KR' ? '정말 삭제하시겠습니까?' : 'Are you sure to delete?'
    );
    if (!result) {
      return;
    }

    try {
      await apiRequest('delete', `/court-boards/${id}`);
      toastSuccess(language === 'KR' ? '삭제되었습니다.' : 'Deleted successfully');
      navigate('/court-board');
    } catch (error) {
      console.error('삭제 실패:', error);
      toastError(language === 'KR' ? '삭제 중 오류가 발생했습니다.' : 'Failed to delete');
    }
  };

  const handleBack = () => {
    navigate('/court-board');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hour}:${min}`;
  };

  const formatCourtDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hour}:${min}`;
  };

  if (loading) {
    return (
      <div className="court-board-detail-page">
        <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="court-board-detail-page">
        <div className="empty-state">
          {language === 'KR' ? '게시글을 찾을 수 없습니다.' : 'Post not found.'}
        </div>
      </div>
    );
  }

  // 이미지 배열 처리
  const images = Array.isArray(board.court_image) ? board.court_image : board.court_image ? [board.court_image] : [];

  // 비용 표시
  let costDisplay = '';
  if (board.cost === -1) {
    costDisplay = language === 'KR' ? '문의' : 'Inquire';
  } else if (board.cost === 0) {
    costDisplay = language === 'KR' ? '무료' : 'Free';
  } else {
    costDisplay = `${board.cost.toLocaleString()}${language === 'KR' ? '원' : ' KRW'}`;
  }

  const isAuthor = isLogin && myInfo?.id === board.author?.id;

  return (
    <div className="court-board-detail-page">
      <div className="container">
        <div className="detail-header">
        <button onClick={handleBack} className="btn btn-back">
          ← {language === 'KR' ? '목록' : 'Back'}
        </button>
        {isAuthor && (
          <div className="btn-group">
            <button onClick={handleEdit} className="btn btn-secondary">
              {language === 'KR' ? '수정' : 'Edit'}
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              {language === 'KR' ? '삭제' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <div className="detail-content">
        {/* 타입 뱃지 */}
        <div className="content-header">
          <span className={`type-badge ${board.type === '대관' ? 'rent' : 'transfer'}`}>
            {board.type}
          </span>
        </div>

        {/* 제목 */}
        <h1 className="detail-title">{board.title}</h1>

        {/* 작성자 및 작성일 */}
        <div className="detail-meta">
          <span className="author">{board.author?.name || '알 수 없음'}</span>
          <span className="divider">|</span>
          <span className="date">{formatDate(board.created_at)}</span>
          <span className="divider">|</span>
          <span className="views">
            👁️ {board.view_count || 0} {language === 'KR' ? '조회' : 'views'}
          </span>
        </div>

        {/* 코트 이미지 */}
        {images && images.length > 0 && (
          <div className="detail-images">
            {images.map((image, idx) => (
              <img
                key={idx}
                src={image}
                alt={`Court ${idx + 1}`}
                className="detail-image"
                onClick={() => setSelectedImage(image)}
              />
            ))}
          </div>
        )}

        {/* 이미지 모달 */}
        {selectedImage && (
          <div className="image-modal" onClick={() => setSelectedImage(null)}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="image-modal-close"
                onClick={() => setSelectedImage(null)}
                aria-label={language === 'KR' ? '닫기' : 'Close'}
              >
                ✕
              </button>
              <img src={selectedImage} alt="Court" className="image-modal-image" />
              {images.length > 1 && (
                <div className="image-modal-nav">
                  <button
                    className="image-modal-prev"
                    onClick={() => {
                      const currentIndex = images.indexOf(selectedImage);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
                      setSelectedImage(images[prevIndex]);
                    }}
                    aria-label={language === 'KR' ? '이전 이미지' : 'Previous image'}
                  >
                    ‹
                  </button>
                  <span className="image-modal-counter">
                    {images.indexOf(selectedImage) + 1} / {images.length}
                  </span>
                  <button
                    className="image-modal-next"
                    onClick={() => {
                      const currentIndex = images.indexOf(selectedImage);
                      const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
                      setSelectedImage(images[nextIndex]);
                    }}
                    aria-label={language === 'KR' ? '다음 이미지' : 'Next image'}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 상세 정보 */}
        <div className="detail-info">
          <div className="info-row">
            <span className="info-label">{language === 'KR' ? '일시' : 'Date/Time'}</span>
            <span className="info-value">{formatCourtDate(board.court_date)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{language === 'KR' ? '지역' : 'Region'}</span>
            <span className="info-value">{board.region}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{language === 'KR' ? '장소' : 'Location'}</span>
            <span className="info-value">{board.location}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{language === 'KR' ? '비용' : 'Cost'}</span>
            <span className="info-value">{costDisplay}</span>
          </div>
          {board.contact && (
            <div className="info-row">
              <span className="info-label">{language === 'KR' ? '연락처' : 'Contact'}</span>
              <span className="info-value">{board.contact}</span>
            </div>
          )}
          {board.court_size && (
            <div className="info-row">
              <span className="info-label">{language === 'KR' ? '코트 사이즈' : 'Court Size'}</span>
              <span className="info-value">{board.court_size}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">{language === 'KR' ? '편의 시설' : 'Facilities'}</span>
            <div className="info-value facilities">
              {board.has_parking ? (
                <span className="facility-badge available">
                  {language === 'KR' ? '주차가능' : 'Parking Available'}
                </span>
              ) : (
                <span className="facility-badge unavailable">
                  {language === 'KR' ? '주차불가' : 'No Parking'}
                </span>
              )}
              {board.has_shower ? (
                <span className="facility-badge available">
                  {language === 'KR' ? '샤워가능' : 'Shower Available'}
                </span>
              ) : (
                <span className="facility-badge unavailable">
                  {language === 'KR' ? '샤워불가' : 'No Shower'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 설명 */}
        {board.content && (
          <div className="detail-description">
            <h3>{language === 'KR' ? '설명' : 'Description'}</h3>
            <div className="description-content">{board.content}</div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default CourtBoardDetail;
