import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess } from '../../utils/alert';
import './CreateTeamPage.scss';

const CreateTeamPage = () => {
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
  const myInfo = useAuthStore((state) => state.myInfo);

  const [formData, setFormData] = useState({
    name: '',
    intro: '',
    logo_url: '',
    region: '',
    established_at: '',
    is_public: 1,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'is_public' ? parseInt(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toastError(language === 'KR' ? '팀명을 입력해주세요.' : 'Please enter team name.');
      return;
    }

    if (!formData.region) {
      toastError(language === 'KR' ? '주 활동 지역을 입력해주세요.' : 'Please enter region.');
      return;
    }

    try {
      // 종목은 전역 상태에서 가져오거나 기본값으로 basketball 사용
      const requestData = {
        name: formData.name,
        leader_id: myInfo.id,
        sports: 'basketball', // 현재는 농구만 지원
        region: formData.region,
        intro: formData.intro || null,
        logo_url: formData.logo_url || null,
        established_at: formData.established_at || null,
        is_public: formData.is_public,
      };

      const response = await apiRequest('post', '/team/create-team', requestData);

      if (response.success) {
        toastSuccess(language === 'KR' ? '팀이 성공적으로 생성되었습니다.' : 'Team created successfully.');
        navigate('/locker-room');
      }
    } catch (error) {
      console.error('팀 생성 실패:', error);
      toastError(
        error.response?.data?.message ||
          (language === 'KR' ? '팀 생성 중 오류가 발생했습니다.' : 'Error creating team.')
      );
    }
  };

  return (
    <div className="create-team-page">
      <div className="container">
        <div className="form-header">
          <div className="form-header-content">
            <div className="icon">🏀</div>
            <div className="text">
              <h1 className="form-title">
                {language === 'KR' ? '팀 만들기' : 'Create Team'}
              </h1>
              <p className="form-subtitle">
                {language === 'KR'
                  ? '새로운 팀을 생성하고 멤버들을 모집하세요'
                  : 'Create a new team and recruit members'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="team-form">
          <div className="form-group required">
            <label>
              {language === 'KR' ? '팀명' : 'Team Name'}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? '팀명을 입력하세요' : 'Enter team name'}
              required
            />
          </div>

          <div className="form-group required">
            <label>
              {language === 'KR' ? '주 활동 지역' : 'Main Region'}
            </label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? '예: 서울 강남구' : 'e.g., Gangnam, Seoul'}
              required
            />
          </div>

          <div className="form-group">
            <label>
              {language === 'KR' ? '팀 소개' : 'Team Introduction'}
            </label>
            <textarea
              name="intro"
              value={formData.intro}
              onChange={handleChange}
              className="form-textarea"
              placeholder={
                language === 'KR'
                  ? '팀에 대한 소개를 작성해주세요'
                  : 'Write an introduction about your team'
              }
              rows="6"
            />
          </div>

          <div className="form-group">
            <label>
              {language === 'KR' ? '로고 이미지 URL' : 'Logo Image URL'}
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? 'https://...' : 'https://...'}
            />
            <span className="form-hint">
              {language === 'KR'
                ? '팀 로고 이미지의 URL을 입력하세요'
                : 'Enter the URL of your team logo image'}
            </span>
          </div>

          <div className="form-group">
            <label>
              {language === 'KR' ? '창단 일시' : 'Established Date'}
            </label>
            <input
              type="datetime-local"
              name="established_at"
              value={formData.established_at}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>
              {language === 'KR' ? '공개 여부' : 'Visibility'}
            </label>
            <select
              name="is_public"
              value={formData.is_public}
              onChange={handleChange}
              className="form-input"
            >
              <option value={1}>{language === 'KR' ? '공개' : 'Public'}</option>
              <option value={0}>{language === 'KR' ? '비공개' : 'Private'}</option>
            </select>
            <span className="form-hint">
              {language === 'KR'
                ? '공개 팀은 모든 사용자가 볼 수 있고, 비공개 팀은 초대된 멤버만 볼 수 있습니다'
                : 'Public teams are visible to all users, private teams are only visible to invited members'}
            </span>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/')} className="btn btn-secondary">
              {language === 'KR' ? '취소' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              {language === 'KR' ? '팀 생성' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamPage;
