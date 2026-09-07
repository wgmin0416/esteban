import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toastSuccess, toastError } from '../../utils/alert';
import './ProfilePage.scss';

const ProfilePage = () => {
  const myInfo = useAuthStore((state) => state.myInfo);
  const getMyInfo = useAuthStore((state) => state.getMyInfo);
  const myTeams = useTeamStore((state) => state.myTeams);
  const getMyTeams = useTeamStore((state) => state.getMyTeams);
  const language = useLanguageStore((state) => state.language);
  const isAuthChecking = useAuthStore((state) => state.isAuthChecking);

  const [updateInfo, setUpdateInfo] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    gender: '',
    is_marketing_agreed: false,
  });

  const [defaultTeamId, setDefaultTeamId] = useState(null);
  const [loading, setLoading] = useState(false);

  // myTeams가 없을 때만 로드 (App.jsx에서 이미 getMyInfo() 호출 중)
  useEffect(() => {
    if (!myTeams) {
      getMyTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // myInfo가 변경될 때마다 updateInfo 업데이트
  useEffect(() => {
    if (myInfo?.id) {
      setUpdateInfo({
        id: myInfo.id || '',
        name: myInfo.name || '',
        email: myInfo.email || '',
        phone: myInfo.phone || '',
        gender: myInfo.gender || '',
        is_marketing_agreed:
          myInfo.is_marketing_agreed === 1 || myInfo.is_marketing_agreed === true,
      });
    }
  }, [myInfo]);

  // myTeams의 기본 팀 설정 (팀 목록이 변경되었을 때만)
  useEffect(() => {
    if (myTeams && myTeams.length > 0 && !defaultTeamId) {
      const defaultTeam = myTeams.find((team) => team.is_default === 1);
      setDefaultTeamId(defaultTeam ? defaultTeam.id : myTeams[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTeams]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUpdateInfo({
      ...updateInfo,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleDefaultTeamChange = (e) => {
    setDefaultTeamId(parseInt(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 빈 문자열을 null로 변환하여 백엔드에 전달
      const payload = {
        email: updateInfo.email?.trim() || null,
        phone: updateInfo.phone?.trim() || null,
        gender: updateInfo.gender || null,
        is_marketing_agreed: updateInfo.is_marketing_agreed ? 1 : 0,
      };

      // default_team_id가 있을 때만 추가
      if (defaultTeamId) {
        payload.default_team_id = defaultTeamId;
      }

      await apiRequest('put', '/user/update', payload);
      toastSuccess(
        language === 'KR' ? '정보가 수정되었습니다.' : 'Information updated successfully.'
      );
      
      // 정보 수정 후 내 정보 다시 가져오기 (에러가 발생해도 로그인 상태는 유지)
      try {
        await getMyInfo();
      } catch (refreshError) {
        console.error('정보 새로고침 실패:', refreshError);
        // 새로고침 실패해도 로그인 상태는 유지
      }
    } catch (error) {
      console.error('정보 수정 실패:', error);
      toastError(language === 'KR' ? '정보 수정에 실패했습니다.' : 'Failed to update information.');
    } finally {
      setLoading(false);
    }
  };

  // 로딩 중이거나 myInfo가 없을 때
  if (isAuthChecking || !myInfo || Object.keys(myInfo).length === 0) {
    return (
      <div className="profile-page">
        <div className="container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="form-header">
          <div className="form-header-content">
            <div className="icon">👤</div>
            <div className="text">
              <h1 className="form-title">{language === 'KR' ? '내 정보' : 'My Profile'}</h1>
              <p className="form-subtitle">
                {language === 'KR'
                  ? '프로필 정보를 수정할 수 있습니다.'
                  : 'Update your profile information.'}
              </p>
            </div>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{language === 'KR' ? '사용자 ID' : 'User ID'}</label>
            <input
              type="text"
              name="id"
              value={updateInfo.id}
              disabled={true}
              className="form-input"
            />
            <span className="form-hint">
              {language === 'KR' ? '사용자 ID는 변경할 수 없습니다.' : 'User ID cannot be changed.'}
            </span>
          </div>

          <div className="form-group">
            <label>{language === 'KR' ? '이름' : 'Name'}</label>
            <input
              type="text"
              name="name"
              value={updateInfo.name}
              disabled={true}
              className="form-input"
            />
            <span className="form-hint">
              {language === 'KR' ? '이름은 변경할 수 없습니다.' : 'Name cannot be changed.'}
            </span>
          </div>

          <div className="form-group">
            <label>{language === 'KR' ? '이메일' : 'Email'}</label>
            <input
              type="email"
              name="email"
              value={updateInfo.email}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? '이메일을 입력하세요' : 'Enter your email'}
            />
          </div>

          <div className="form-group">
            <label>{language === 'KR' ? '전화번호' : 'Phone Number'}</label>
            <input
              type="tel"
              name="phone"
              value={updateInfo.phone}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? '전화번호를 입력하세요' : 'Enter your phone number'}
              maxLength={11}
            />
          </div>

          <div className="form-group">
            <label>{language === 'KR' ? '성별' : 'Gender'}</label>
            <select
              name="gender"
              value={updateInfo.gender}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">{language === 'KR' ? '선택 안 함' : 'Not specified'}</option>
              <option value="male">{language === 'KR' ? '남성' : 'Male'}</option>
              <option value="female">{language === 'KR' ? '여성' : 'Female'}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{language === 'KR' ? '기본 팀' : 'Default Team'}</label>
            <select
              name="default_team_id"
              value={defaultTeamId || ''}
              onChange={handleDefaultTeamChange}
              className="form-select"
            >
              {myTeams && myTeams.length > 0 ? (
                myTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}{' '}
                    {team.is_default === 1 ? `(${language === 'KR' ? '기본' : 'Default'})` : ''}
                  </option>
                ))
              ) : (
                <option value="">
                  {language === 'KR' ? '팀이 없습니다' : 'No teams available'}
                </option>
              )}
            </select>
            <span className="form-hint">
              {language === 'KR' ? '기본으로 사용할 팀을 선택하세요.' : 'Select your default team.'}
            </span>
            <Link to="/create-team" className="create-team-link">
              ＋ {language === 'KR' ? '팀 만들기' : 'Create Team'}
            </Link>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_marketing_agreed"
                checked={updateInfo.is_marketing_agreed}
                onChange={handleChange}
                className="form-checkbox"
              />
              <span>{language === 'KR' ? '마케팅 수신 동의' : 'Marketing Consent'}</span>
            </label>
            <span className="form-hint">
              {language === 'KR'
                ? '마케팅 정보 수신에 동의하시겠습니까?'
                : 'Do you agree to receive marketing information?'}
            </span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? language === 'KR'
                  ? '저장 중...'
                  : 'Saving...'
                : language === 'KR'
                  ? '저장하기'
                  : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
