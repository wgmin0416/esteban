import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { formatMatchDateTime } from '../../utils/dateUtils';
import { toastError, toastSuccess, toastWarning, confirm } from '../../utils/alert';
import './MatchBoardDetail.scss';

const MatchBoardDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const myInfo = useAuthStore((state) => state.myInfo);
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadBoard();
  }, [id]);

  const loadBoard = async () => {
    setLoading(true);
    try {
      // TODO: API 연결
      // const response = await apiRequest('get', `/match-boards/${id}`);
      // if (response?.data) {
      //   setBoard(response.data);
      //   setHasApplied(response.data.has_applied);
      // }

      // 임시 더미 데이터
      const matchStart = new Date(Date.now() + 86400000);
      const matchEnd = new Date(matchStart.getTime() + 2 * 60 * 60 * 1000);
      const maxParticipants = 10;
      const currentParticipants = 4;

      setBoard({
        id: parseInt(id),
        type: 'team',
        team_name: '레드팀',
        match_start_time: matchStart.toISOString(),
        match_end_time: matchEnd.toISOString(),
        location: '서울 체육관',
        cost: 50000,
        max_participants: maxParticipants,
        current_participants: currentParticipants,
        skill_level: '중상',
        game_format: '10분 4쿼터 3게임',
        uniform: '빨강/검정',
        contact: '010-1234-5678',
        has_parking: true,
        has_air_conditioning: true,
        has_shower: false,
        description: '경기 모집합니다. 즐거운 경기 함께해요!\n\n연락 주시면 자세한 사항 안내드리겠습니다.',
        view_count: 42,
        status: currentParticipants >= maxParticipants ? 'closed' : 'open',
        created_at: new Date().toISOString(),
        author: {
          id: 1,
          name: '작성자',
          profile_image: null,
        },
      });
      setHasApplied(false);
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      toastError(language === 'KR' ? '게시글을 불러올 수 없습니다.' : 'Failed to load post');
      navigate('/match-board');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isLogin) {
      toastWarning(language === 'KR' ? '로그인이 필요합니다.' : 'Please login first');
      navigate('/login');
      return;
    }

    if (board.status === 'closed') {
      toastWarning(language === 'KR' ? '모집이 마감되었습니다.' : 'Recruitment closed');
      return;
    }

    setIsApplying(true);
    try {
      // TODO: API 연결
      // await apiRequest('post', `/match-boards/${id}/apply`);
      toastSuccess(language === 'KR' ? '신청이 완료되었습니다!' : 'Application submitted!');
      setHasApplied(true);
      // 인원수 증가
      setBoard((prev) => ({
        ...prev,
        current_participants: prev.current_participants + 1,
        status: prev.current_participants + 1 >= prev.max_participants ? 'closed' : 'open',
      }));
    } catch (error) {
      console.error('신청 실패:', error);
      toastError(language === 'KR' ? '신청 중 오류가 발생했습니다.' : 'Failed to apply');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancelApplication = async () => {
    const result = await confirm(language === 'KR' ? '신청을 취소하시겠습니까?' : 'Cancel application?');
    if (!result) {
      return;
    }

    setIsApplying(true);
    try {
      // TODO: API 연결
      // await apiRequest('delete', `/match-boards/${id}/cancel`);
      toastSuccess(language === 'KR' ? '신청이 취소되었습니다.' : 'Application cancelled');
      setHasApplied(false);
      // 인원수 감소
      setBoard((prev) => ({
        ...prev,
        current_participants: Math.max(0, prev.current_participants - 1),
        status: 'open',
      }));
    } catch (error) {
      console.error('신청 취소 실패:', error);
      toastError(language === 'KR' ? '취소 중 오류가 발생했습니다.' : 'Failed to cancel');
    } finally {
      setIsApplying(false);
    }
  };

  const handleEdit = () => {
    navigate(`/match-board/edit/${id}`);
  };

  const handleDelete = async () => {
    const result = await confirm(language === 'KR' ? '정말 삭제하시겠습니까?' : 'Are you sure to delete?');
    if (!result) {
      return;
    }

    try {
      // TODO: API 연결
      // await apiRequest('delete', `/match-boards/${id}`);
      toastSuccess(language === 'KR' ? '삭제되었습니다.' : 'Deleted successfully');
      navigate('/match-board');
    } catch (error) {
      console.error('삭제 실패:', error);
      toastError(language === 'KR' ? '삭제 중 오류가 발생했습니다.' : 'Failed to delete');
    }
  };

  const handleBack = () => {
    navigate('/match-board');
  };

  const getTypeLabel = (type) => {
    const labels = {
      team: language === 'KR' ? '팀 초청' : 'Team Match',
      guest: language === 'KR' ? '게스트 초청' : 'Guest Match',
      pickup: language === 'KR' ? '픽업' : 'Pickup',
    };
    return labels[type] || type;
  };


  const formatCreatedDate = (dateString) => {
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
      <div className="match-board-detail-page">
        <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="match-board-detail-page">
        <div className="empty-state">{language === 'KR' ? '게시글을 찾을 수 없습니다.' : 'Post not found.'}</div>
      </div>
    );
  }

  const isAuthor = isLogin && myInfo?.id === board.author.id;
  const isFull = board.current_participants >= board.max_participants;

  return (
    <div className="match-board-detail-page">
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
          <span className={`type-badge type-${board.type}`}>{getTypeLabel(board.type)}</span>
          <span className={`status-badge status-${board.status}`}>
            {board.status === 'open'
              ? language === 'KR'
                ? '모집중'
                : 'Open'
              : language === 'KR'
              ? '마감'
              : 'Closed'}
          </span>
        </div>

        {/* 팀명/제목 */}
        <h1 className="detail-title">
          {board.team_name || (language === 'KR' ? '픽업 게임' : 'Pickup Game')}
        </h1>

        {/* 작성자 및 작성일 */}
        <div className="detail-meta">
          <span className="author">{board.author.name}</span>
          <span className="divider">|</span>
          <span className="date">{formatCreatedDate(board.created_at)}</span>
          <span className="divider">|</span>
          <span className="views">
            👁️ {board.view_count} {language === 'KR' ? '조회' : 'views'}
          </span>
        </div>

        {/* 인원수 (강조) */}
        <div className="participants-section">
          <div className="participants-card">
            <div className="icon">👥</div>
            <div className="info">
              <div className="label">{language === 'KR' ? '현재 신청 인원' : 'Participants'}</div>
              <div className="count">
                <span className="current">{board.current_participants}</span>
                <span className="separator">/</span>
                <span className="max">{board.max_participants}</span>
              </div>
            </div>
            {isFull && <div className="full-badge">{language === 'KR' ? '정원 마감' : 'Full'}</div>}
          </div>
        </div>

        {/* 경기 날짜/시간 (강조) */}
        <div className="match-datetime">
          <div className="label">📅 {language === 'KR' ? '경기 일시' : 'Match Time'}</div>
          <div className="value">{formatMatchDateTime(board.match_start_time, board.match_end_time, true)}</div>
        </div>

        {/* 상세 정보 */}
        <div className="detail-info">
          <div className="info-row">
            <div className="label">📍 {language === 'KR' ? '장소' : 'Location'}</div>
            <div className="value">{board.location}</div>
          </div>

          <div className="info-row">
            <div className="label">💰 {language === 'KR' ? '비용' : 'Cost'}</div>
            <div className="value">
              {board.cost.toLocaleString()}
              {language === 'KR' ? '원' : ' KRW'}
            </div>
          </div>

          {board.skill_level && (
            <div className="info-row">
              <div className="label">🏀 {language === 'KR' ? '실력' : 'Skill Level'}</div>
              <div className="value">{board.skill_level}</div>
            </div>
          )}

          {board.game_format && (
            <div className="info-row">
              <div className="label">⚡ {language === 'KR' ? '경기 방식' : 'Game Format'}</div>
              <div className="value">{board.game_format}</div>
            </div>
          )}

          {board.uniform && (
            <div className="info-row">
              <div className="label">👕 {language === 'KR' ? '유니폼' : 'Uniform'}</div>
              <div className="value">{board.uniform}</div>
            </div>
          )}

          {board.contact && (
            <div className="info-row">
              <div className="label">📞 {language === 'KR' ? '연락처' : 'Contact'}</div>
              <div className="value">{board.contact}</div>
            </div>
          )}

          {/* 편의시설 */}
          <div className="info-row">
            <div className="label">🏢 {language === 'KR' ? '편의시설' : 'Facilities'}</div>
            <div className="value">
              <div className="facilities">
                {board.has_parking && <span className="facility">✅ {language === 'KR' ? '주차' : 'Parking'}</span>}
                {board.has_air_conditioning && (
                  <span className="facility">✅ {language === 'KR' ? '냉/난방' : 'AC/Heating'}</span>
                )}
                {board.has_shower && <span className="facility">✅ {language === 'KR' ? '샤워' : 'Shower'}</span>}
                {!board.has_parking && !board.has_air_conditioning && !board.has_shower && (
                  <span className="no-facility">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 설명 */}
        {board.description && (
          <div className="detail-description">
            <div className="label">{language === 'KR' ? '상세 설명' : 'Description'}</div>
            <div className="content">{board.description}</div>
          </div>
        )}

        {/* 신청 버튼 (작성자가 아닐 때만 표시) */}
        {!isAuthor && (
          <div className="action-section">
            {hasApplied ? (
              <button onClick={handleCancelApplication} className="btn btn-cancel" disabled={isApplying}>
                {isApplying
                  ? language === 'KR'
                    ? '처리 중...'
                    : 'Processing...'
                  : language === 'KR'
                  ? '신청 취소하기'
                  : 'Cancel Application'}
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="btn btn-apply"
                disabled={isApplying || isFull}
              >
                {isApplying
                  ? language === 'KR'
                    ? '처리 중...'
                    : 'Processing...'
                  : isFull
                  ? language === 'KR'
                    ? '모집 마감'
                    : 'Full'
                  : language === 'KR'
                  ? '참가 신청하기'
                  : 'Apply Now'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchBoardDetail;
