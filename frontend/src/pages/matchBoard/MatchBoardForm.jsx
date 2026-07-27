import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess, toastWarning } from '../../utils/alert';
import './MatchBoardForm.scss';

const MatchBoardForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);

  const [formData, setFormData] = useState({
    type: 'team',
    team_id: '',
    match_start_time: '',
    match_end_time: '',
    location: '',
    cost: '',
    max_participants: '',
    skill_level: '',
    game_format: '',
    uniform: '',
    contact: '',
    has_parking: false,
    has_air_conditioning: false,
    has_shower: false,
    description: '',
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
      loadBoard();
    }
  }, [id, isLogin]);

  const loadMyTeams = async () => {
    try {
      // TODO: API 연결 - 내가 leader/manager인 팀 목록
      // const response = await apiRequest('get', '/team/my-managed-teams');
      // if (response?.data) {
      //   setMyTeams(response.data);
      // }
      
      // 임시 더미 데이터
      setMyTeams([
        { id: 1, name: '레드팀' },
        { id: 2, name: '블루팀' },
        { id: 3, name: '그린팀' },
      ]);
    } catch (error) {
      console.error('팀 목록 로드 실패:', error);
    }
  };

  const loadBoard = async () => {
    try {
      // TODO: API 연결
      // const response = await apiRequest('get', `/match-boards/${id}`);
      // if (response?.data) {
      //   setFormData(response.data);
      // }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      toastError(language === 'KR' ? '게시글을 불러올 수 없습니다.' : 'Failed to load post');
      navigate('/match-board');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수 항목 검증
    if (!formData.match_start_time || !formData.match_end_time || !formData.location || !formData.cost || !formData.max_participants) {
      toastError(language === 'KR' ? '필수 항목을 모두 입력해주세요.' : 'Please fill all required fields');
      return;
    }

    // 픽업이 아닌 경우 팀 선택 필수
    if (formData.type !== 'pickup' && !formData.team_id) {
      toastError(language === 'KR' ? '팀을 선택해주세요.' : 'Please select a team');
      return;
    }

    setLoading(true);
    try {
      // TODO: API 연결
      // if (id) {
      //   await apiRequest('put', `/match-boards/${id}`, formData);
      //   toastSuccess(language === 'KR' ? '수정되었습니다.' : 'Updated successfully');
      // } else {
      //   await apiRequest('post', '/match-boards', formData);
      //   toastSuccess(language === 'KR' ? '작성되었습니다.' : 'Created successfully');
      // }
      // navigate('/match-board');

      // 임시
      toastSuccess(id ? (language === 'KR' ? '수정되었습니다.' : 'Updated') : (language === 'KR' ? '작성되었습니다.' : 'Created'));
      navigate('/match-board');
    } catch (error) {
      console.error('작성/수정 실패:', error);
      toastError(language === 'KR' ? '오류가 발생했습니다.' : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="match-board-form-page">
      <div className="form-header">
        <div className="form-header-content">
          <div className="icon">🏀</div>
          <div className="text">
            <h1 className="form-title">
              {id
                ? language === 'KR'
                  ? '경기 정보 수정'
                  : 'Edit Match'
                : language === 'KR'
                ? '경기 모집 등록'
                : 'Create Match'}
            </h1>
            <p className="form-subtitle">
              {language === 'KR'
                ? '농구 경기를 모집하고 함께할 팀을 찾아보세요'
                : 'Recruit players for your basketball match'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="match-form">
        {/* 모집 유형 */}
        <div className="form-group required">
          <label>{language === 'KR' ? '모집 유형' : 'Type'}</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                value="team"
                checked={formData.type === 'team'}
                onChange={handleChange}
              />
              <span>{language === 'KR' ? '팀 초청' : 'Team Match'}</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                value="guest"
                checked={formData.type === 'guest'}
                onChange={handleChange}
              />
              <span>{language === 'KR' ? '게스트 초청' : 'Guest Match'}</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                value="pickup"
                checked={formData.type === 'pickup'}
                onChange={handleChange}
              />
              <span>{language === 'KR' ? '픽업' : 'Pickup'}</span>
            </label>
          </div>
        </div>

        {/* 팀 선택 (픽업 제외) */}
        {formData.type !== 'pickup' && (
          <div className="form-group required">
            <label>{language === 'KR' ? '팀 선택' : 'Select Team'}</label>
            <select
              name="team_id"
              value={formData.team_id}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">
                {language === 'KR' ? '팀을 선택하세요' : 'Select a team'}
              </option>
              {myTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <small className="form-hint">
              {language === 'KR'
                ? '내가 매니저 또는 리더인 팀만 표시됩니다'
                : 'Only teams you manage are shown'}
            </small>
          </div>
        )}

        {/* 일시 */}
        <div className="form-row">
          <div className="form-group required">
            <label>{language === 'KR' ? '시작 시간' : 'Start Time'}</label>
            <input
              type="datetime-local"
              name="match_start_time"
              value={formData.match_start_time}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group required">
            <label>{language === 'KR' ? '종료 시간' : 'End Time'}</label>
            <input
              type="datetime-local"
              name="match_end_time"
              value={formData.match_end_time}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        {/* 장소 */}
        <div className="form-group required">
          <label>{language === 'KR' ? '장소' : 'Location'}</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder={language === 'KR' ? '주소를 입력하세요' : 'Enter address'}
            className="form-input"
          />
        </div>

        {/* 비용 */}
        <div className="form-row">
          <div className="form-group required">
            <label>{language === 'KR' ? '비용 (원)' : 'Cost (KRW)'}</label>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              placeholder="10000"
              min="0"
              step="1000"
              className="form-input"
            />
          </div>

          {/* 모집 인원 */}
          <div className="form-group required">
            <label>{language === 'KR' ? '모집 인원' : 'Max Participants'}</label>
            <input
              type="number"
              name="max_participants"
              value={formData.max_participants}
              onChange={handleChange}
              placeholder="10"
              min="1"
              max="50"
              className="form-input"
            />
          </div>
        </div>

        {/* 실력 (픽업 제외) */}
        {formData.type !== 'pickup' && (
          <div className="form-group">
            <label>{language === 'KR' ? '실력 수준' : 'Skill Level'}</label>
            <input
              type="text"
              name="skill_level"
              value={formData.skill_level}
              onChange={handleChange}
              placeholder={language === 'KR' ? '예: 중상, 중, 중하' : 'e.g., Advanced, Intermediate'}
              className="form-input"
            />
          </div>
        )}

        {/* 경기 방식 */}
        <div className="form-group">
          <label>{language === 'KR' ? '경기 방식' : 'Game Format'}</label>
          <input
            type="text"
            name="game_format"
            value={formData.game_format}
            onChange={handleChange}
            placeholder="10분 4쿼터 3게임"
            className="form-input"
          />
        </div>

        {/* 유니폼 */}
        <div className="form-row">
          <div className="form-group">
            <label>{language === 'KR' ? '유니폼' : 'Uniform'}</label>
            <input
              type="text"
              name="uniform"
              value={formData.uniform}
              onChange={handleChange}
              placeholder="빨강/검정"
              className="form-input"
            />
          </div>

          {/* 연락처 */}
          <div className="form-group">
            <label>{language === 'KR' ? '연락처' : 'Contact'}</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              placeholder={language === 'KR' ? '010-1234-5678' : '010-1234-5678'}
              className="form-input"
            />
          </div>
        </div>

        {/* 편의시설 */}
        <div className="form-group">
          <label>{language === 'KR' ? '편의시설' : 'Facilities'}</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="has_parking"
                checked={formData.has_parking}
                onChange={handleChange}
              />
              <span>{language === 'KR' ? '주차' : 'Parking'}</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="has_air_conditioning"
                checked={formData.has_air_conditioning}
                onChange={handleChange}
              />
              <span>{language === 'KR' ? '냉/난방' : 'AC/Heating'}</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="has_shower"
                checked={formData.has_shower}
                onChange={handleChange}
              />
              <span>{language === 'KR' ? '샤워' : 'Shower'}</span>
            </label>
          </div>
        </div>

        {/* 설명 */}
        <div className="form-group">
          <label>{language === 'KR' ? '설명' : 'Description'}</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={language === 'KR' ? '상세 내용을 입력하세요' : 'Enter details...'}
            rows="6"
            className="form-textarea"
          />
        </div>

        {/* 버튼 */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/match-board')}
            className="btn btn-secondary"
            disabled={loading}
          >
            {language === 'KR' ? '취소' : 'Cancel'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? language === 'KR'
                ? '처리 중...'
                : 'Processing...'
              : id
              ? language === 'KR'
                ? '수정'
                : 'Update'
              : language === 'KR'
              ? '작성'
              : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchBoardForm;
