import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../lib/apiRequest';
import useAuthStore from '../../store/useAuthStore';

const CreateTeamPage = () => {
  const navigate = useNavigate();
  const myInfo = useAuthStore((state) => state.myInfo);

  const [formData, setFormData] = useState({
    name: '',
    sports: 'basketball',
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
      alert('팀명을 입력해주세요.');
      return;
    }

    if (!formData.region) {
      alert('주 활동 지역을 입력해주세요.');
      return;
    }

    try {
      const requestData = {
        name: formData.name,
        leader_id: myInfo.id,
        sports: formData.sports,
        region: formData.region,
        intro: formData.intro || null,
        logo_url: formData.logo_url || null,
        established_at: formData.established_at || null,
        is_public: formData.is_public,
      };

      const response = await apiRequest('post', '/team/create-team', requestData);

      if (response.success) {
        alert('팀이 성공적으로 생성되었습니다.');
        navigate('/locker-room');
      }
    } catch (error) {
      console.error('팀 생성 실패:', error);
    }
  };

  return (
    <div>
      <h1>팀 만들기</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            팀명 (필수):
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </label>
        </div>

        <div>
          <label>
            종목 (필수):
            <select name="sports" value={formData.sports} onChange={handleChange} required>
              <option value="basketball">농구</option>
            </select>
          </label>
        </div>

        <div>
          <label>
            주 활동 지역 (필수):
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <div>
          <label>
            팀 소개:
            <textarea name="intro" value={formData.intro} onChange={handleChange} rows="4" />
          </label>
        </div>

        <div>
          <label>
            로고 이미지 URL:
            <input type="url" name="logo_url" value={formData.logo_url} onChange={handleChange} />
          </label>
        </div>

        <div>
          <label>
            창단 일시:
            <input
              type="datetime-local"
              name="established_at"
              value={formData.established_at}
              onChange={handleChange}
            />
          </label>
        </div>

        <div>
          <label>
            공개 여부:
            <select name="is_public" value={formData.is_public} onChange={handleChange}>
              <option value={1}>공개</option>
              <option value={0}>비공개</option>
            </select>
          </label>
        </div>

        <div>
          <button type="submit">팀 생성</button>
          <button type="button" onClick={() => navigate('/')}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeamPage;
