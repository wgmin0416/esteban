import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess, toastWarning, confirm } from '../../utils/alert';
import './MemberRecruitmentForm.scss';

const MemberRecruitmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);

  const [formData, setFormData] = useState({
    team_id: '',
    time: '',
    location: '',
    fee: '',
    position: '',
    is_competition: false,
    team_intro: '',
    join_process: '',
  });

  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLogin) {
      toastWarning(language === 'KR' ? '로그인이 필요합니다.' : 'Please login');
      navigate('/login');
      return;
    }

    loadMyTeams();

    if (id) {
      loadRecruitment();
    }
  }, [id, isLogin]);

  const loadMyTeams = async () => {
    try {
      const response = await apiRequest('get', '/member-recruitments/my-teams/list');
      if (response?.data) {
        setMyTeams(response.data);
        if (response.data.length === 0) {
          toastError(
            language === 'KR'
              ? '글쓰기 권한이 없습니다. 리더 또는 매니저 권한이 있는 농구팀이 필요합니다.'
              : 'You do not have permission to write.'
          );
          navigate('/recruit');
        }
      }
    } catch (error) {
      console.error('팀 목록 로드 실패:', error);
      toastError(
        language === 'KR'
          ? '글쓰기 권한이 없습니다. 리더 또는 매니저 권한이 있는 농구팀이 필요합니다.'
          : 'You do not have permission to write.'
      );
      navigate('/recruit');
    }
  };

  const loadRecruitment = async () => {
    try {
      const response = await apiRequest('get', `/member-recruitments/${id}`);
      if (response?.data) {
        const data = response.data;
        setFormData({
          team_id: data.team_id,
          time: data.time,
          location: data.location,
          fee: data.fee.toString(),
          position: data.position,
          is_competition: data.is_competition === 1,
          team_intro: data.team_intro,
          join_process: data.join_process,
        });
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      toastError(language === 'KR' ? '게시글을 불러올 수 없습니다.' : 'Failed to load post');
      navigate('/recruit');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 필수 항목 검증
      if (
        !formData.team_id ||
        !formData.time ||
        !formData.time.trim() ||
        !formData.location ||
        !formData.location.trim() ||
        formData.fee === '' ||
        formData.fee === null ||
        formData.fee === undefined ||
        !formData.position ||
        !formData.position.trim() ||
        !formData.team_intro ||
        !formData.team_intro.trim() ||
        !formData.join_process ||
        !formData.join_process.trim()
      ) {
        toastError(
          language === 'KR' ? '필수 항목을 모두 입력해주세요.' : 'Please fill all required fields'
        );
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        fee: formData.fee !== '' ? parseInt(formData.fee) || 0 : 0,
      };

      console.log('전송할 데이터:', payload); // 디버깅

      if (id) {
        // 수정
        await apiRequest('put', `/member-recruitments/${id}`, payload);
        toastSuccess(language === 'KR' ? '게시글이 수정되었습니다.' : 'Post updated successfully');
      } else {
        // 작성
        await apiRequest('post', '/member-recruitments', payload);
        toastSuccess(language === 'KR' ? '게시글이 작성되었습니다.' : 'Post created successfully');
      }

      navigate('/recruit');
    } catch (error) {
      console.error('게시글 저장 실패:', error);
      toastError(
        language === 'KR'
          ? error.response?.data?.message || '게시글 저장 중 오류가 발생했습니다.'
          : error.response?.data?.message || 'Failed to save post'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const result = await confirm(
      language === 'KR' ? '작성을 취소하시겠습니까?' : 'Cancel writing?'
    );
    if (result) {
      navigate('/recruit');
    }
  };

  return (
    <div className="member-recruitment-form-page">
      <div className="container">
        <div className="form-header">
          <div className="form-header-content">
            <div className="icon">👥</div>
            <div className="text">
              <h1 className="form-title">
                {id
                  ? language === 'KR'
                    ? '팀원 모집 수정'
                    : 'Edit Recruitment'
                  : language === 'KR'
                    ? '팀원 모집 등록'
                    : 'Create Recruitment'}
              </h1>
              <p className="form-subtitle">
                {language === 'KR'
                  ? '팀원을 모집하고 함께할 동료를 찾아보세요'
                  : 'Recruit team members and find teammates'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="recruitment-form">
          {/* 팀 선택 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '팀명' : 'Team Name'}</label>
            <select
              name="team_id"
              value={formData.team_id}
              onChange={handleChange}
              className="form-input"
              disabled={!!id}
            >
              <option value="">{language === 'KR' ? '팀을 선택하세요' : 'Select a team'}</option>
              {myTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <small className="form-hint">
              {language === 'KR'
                ? '리더 또는 매니저 권한이 있는 농구팀만 표시됩니다'
                : 'Only basketball teams with leader or manager role are shown'}
            </small>
          </div>

          {/* 시간 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '시간' : 'Time'}</label>
            <input
              type="text"
              name="time"
              value={formData.time}
              onChange={handleChange}
              placeholder={
                language === 'KR' ? '예: 매주 화요일 저녁 7시' : 'e.g., Every Tuesday 7 PM'
              }
              className="form-input"
            />
          </div>

          {/* 장소 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '장소' : 'Location'}</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={
                language === 'KR' ? '예: 서울시 강남구 체육관' : 'e.g., Gangnam Sports Center'
              }
              className="form-input"
            />
          </div>

          {/* 회비 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '회비 (원)' : 'Fee (KRW)'}</label>
            <input
              type="number"
              name="fee"
              value={formData.fee}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="1000"
              className="form-input"
            />
          </div>

          {/* 포지션 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '포지션' : 'Position'}</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              placeholder={language === 'KR' ? '예: 가드, 포워드' : 'e.g., Guard, Forward'}
              className="form-input"
            />
          </div>

          {/* 대회 참가 여부 */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_competition"
                checked={formData.is_competition}
                onChange={handleChange}
                className="form-checkbox"
              />
              <span>{language === 'KR' ? '대회 참가 여부' : 'Competition Participation'}</span>
            </label>
          </div>

          {/* 팀 소개 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '팀 소개' : 'Team Introduction'}</label>
            <textarea
              name="team_intro"
              value={formData.team_intro}
              onChange={handleChange}
              placeholder={language === 'KR' ? '팀에 대해 소개해주세요' : 'Introduce your team'}
              className="form-textarea"
              rows="6"
            />
          </div>

          {/* 가입 절차 및 참고 사항 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '가입 절차 및 참고 사항' : 'Join Process & Notes'}</label>
            <textarea
              name="join_process"
              value={formData.join_process}
              onChange={handleChange}
              placeholder={
                language === 'KR'
                  ? '가입 절차와 참고 사항을 작성해주세요'
                  : 'Write join process and notes'
              }
              className="form-textarea"
              rows="6"
            />
          </div>

          {/* 버튼 */}
          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              {language === 'KR' ? '취소' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? language === 'KR'
                  ? '처리 중...'
                  : 'Processing...'
                : id
                  ? language === 'KR'
                    ? '수정하기'
                    : 'Update'
                  : language === 'KR'
                    ? '등록하기'
                    : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberRecruitmentForm;
