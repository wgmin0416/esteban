import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { formatDate } from '../../utils/dateUtils';
import { toastError, toastSuccess, toastWarning, confirm } from '../../utils/alert';
import './MemberRecruitmentDetail.scss';

const MemberRecruitmentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const myInfo = useAuthStore((state) => state.myInfo);
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);

  const [recruitment, setRecruitment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadRecruitment();
  }, [id]);

  const loadRecruitment = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('get', `/member-recruitments/${id}`);
      if (response?.data) {
        setRecruitment(response.data);
        setHasApplied(response.data.has_applied || false);
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      toastError(language === 'KR' ? '게시글을 불러올 수 없습니다.' : 'Failed to load post');
      navigate('/recruit');
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

    setIsApplying(true);
    try {
      await apiRequest('post', `/member-recruitments/${id}/apply`);
      toastSuccess(language === 'KR' ? '가입 신청이 완료되었습니다!' : 'Application submitted!');
      setHasApplied(true);
    } catch (error) {
      console.error('가입 신청 실패:', error);
      const errorMessage =
        error.response?.data?.message ||
        (language === 'KR' ? '가입 신청 중 오류가 발생했습니다.' : 'Failed to apply');
      toastError(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancelApplication = async () => {
    const result = await confirm(language === 'KR' ? '가입 신청을 취소하시겠습니까?' : 'Cancel application?');
    if (!result) {
      return;
    }

    setIsApplying(true);
    try {
      await apiRequest('delete', `/member-recruitments/${id}/cancel`);
      toastSuccess(language === 'KR' ? '가입 신청이 취소되었습니다.' : 'Application cancelled');
      setHasApplied(false);
    } catch (error) {
      console.error('가입 신청 취소 실패:', error);
      toastError(language === 'KR' ? '취소 중 오류가 발생했습니다.' : 'Failed to cancel');
    } finally {
      setIsApplying(false);
    }
  };

  const handleEdit = () => {
    navigate(`/recruit/edit/${id}`);
  };

  const handleDelete = async () => {
    const result = await confirm(language === 'KR' ? '정말 삭제하시겠습니까?' : 'Are you sure to delete?');
    if (!result) {
      return;
    }

    try {
      await apiRequest('delete', `/member-recruitments/${id}`);
      toastSuccess(language === 'KR' ? '삭제되었습니다.' : 'Deleted successfully');
      navigate('/recruit');
    } catch (error) {
      console.error('삭제 실패:', error);
      toastError(language === 'KR' ? '삭제 중 오류가 발생했습니다.' : 'Failed to delete');
    }
  };

  const handleBack = () => {
    navigate('/join-recruit');
  };


  if (loading) {
    return (
      <div className="member-recruitment-detail-page">
        <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!recruitment) {
    return (
      <div className="member-recruitment-detail-page">
        <div className="empty-state">{language === 'KR' ? '게시글을 찾을 수 없습니다.' : 'Post not found.'}</div>
      </div>
    );
  }

  const isAuthor = isLogin && myInfo?.id === recruitment.author?.id;

  return (
    <div className="member-recruitment-detail-page">
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
          {/* 팀 정보 */}
          <div className="team-header">
            {recruitment.team?.logo_url && (
              <img src={recruitment.team.logo_url} alt={recruitment.team.name} className="team-logo-large" />
            )}
            <div className="team-info">
              <h1 className="team-name">{recruitment.team?.name || '팀명 없음'}</h1>
              {recruitment.is_competition === 1 && (
                <span className="competition-badge">
                  {language === 'KR' ? '대회 참가' : 'Competition'}
                </span>
              )}
            </div>
          </div>

          {/* 작성자 및 작성일 */}
          <div className="detail-meta">
            <span className="author">{recruitment.author?.name || '작성자'}</span>
            <span className="divider">|</span>
            <span className="date">{formatDate(recruitment.created_at, true)}</span>
            <span className="divider">|</span>
            <span className="views">
              👁️ {recruitment.view_count} {language === 'KR' ? '조회' : 'views'}
            </span>
          </div>

          {/* 상세 정보 */}
          <div className="detail-info">
            <div className="info-row">
              <div className="label">📍 {language === 'KR' ? '장소' : 'Location'}</div>
              <div className="value">{recruitment.location}</div>
            </div>

            <div className="info-row">
              <div className="label">⏰ {language === 'KR' ? '시간' : 'Time'}</div>
              <div className="value">{recruitment.time}</div>
            </div>

            <div className="info-row">
              <div className="label">💰 {language === 'KR' ? '회비' : 'Fee'}</div>
              <div className="value">
                {recruitment.fee.toLocaleString()}
                {language === 'KR' ? '원' : ' KRW'}
              </div>
            </div>

            <div className="info-row">
              <div className="label">🏀 {language === 'KR' ? '포지션' : 'Position'}</div>
              <div className="value">{recruitment.position}</div>
            </div>
          </div>

          {/* 팀 소개 */}
          <div className="detail-section">
            <div className="section-title">{language === 'KR' ? '팀 소개' : 'Team Introduction'}</div>
            <div className="section-content">{recruitment.team_intro}</div>
          </div>

          {/* 가입 절차 및 참고 사항 */}
          <div className="detail-section">
            <div className="section-title">
              {language === 'KR' ? '가입 절차 및 참고 사항' : 'Join Process & Notes'}
            </div>
            <div className="section-content">{recruitment.join_process}</div>
          </div>

          {/* 가입 신청 버튼 (작성자가 아닐 때만 표시) */}
          {!isAuthor && (
            <div className="action-section">
              {hasApplied ? (
                <button onClick={handleCancelApplication} className="btn btn-cancel" disabled={isApplying}>
                  {isApplying
                    ? language === 'KR'
                      ? '처리 중...'
                      : 'Processing...'
                    : language === 'KR'
                    ? '가입 신청 취소하기'
                    : 'Cancel Application'}
                </button>
              ) : (
                <button onClick={handleApply} className="btn btn-apply" disabled={isApplying}>
                  {isApplying
                    ? language === 'KR'
                      ? '처리 중...'
                      : 'Processing...'
                    : language === 'KR'
                    ? '가입 신청하기'
                    : 'Apply to Join'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberRecruitmentDetail;
