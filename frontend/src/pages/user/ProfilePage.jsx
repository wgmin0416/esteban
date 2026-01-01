import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import useTeamStore from '../../store/useTeamStore';
import apiRequest from '../../lib/apiRequest';

const ProfilePage = () => {
  const myInfo = useAuthStore((state) => state.myInfo);
  const getMyInfo = useAuthStore((state) => state.getMyInfo);
  const myTeams = useTeamStore((state) => state.myTeams);
  const getMyTeams = useTeamStore((state) => state.getMyTeams);

  const [updateInfo, setUpdateInfo] = useState({
    id: myInfo.id,
    name: myInfo.name,
    email: myInfo.email,
    phone: myInfo.phone,
  });

  const [defaultTeamId, setDefaultTeamId] = useState(null);

  useEffect(() => {
    getMyTeams();
  }, [getMyTeams]);

  useEffect(() => {
    if (myTeams && myTeams.length > 0) {
      const defaultTeam = myTeams.find((team) => team.is_default === 1);
      if (defaultTeam) {
        setDefaultTeamId(defaultTeam.id);
      } else {
        setDefaultTeamId(myTeams[0].id);
      }
    }
  }, [myTeams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdateInfo({
      ...updateInfo,
      [name]: value,
    });
  };

  const handleDefaultTeamChange = (e) => {
    setDefaultTeamId(parseInt(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('put', '/user/update', {
        email: updateInfo.email,
        phone: updateInfo.phone,
        default_team_id: defaultTeamId,
      });
      alert('정보가 수정되었습니다.');
      await getMyInfo();
    } catch (error) {
      console.error('정보 수정 실패:', error);
    }
  };

  return (
    <div>
      <h1>내 정보</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            ID:
            <input
              type="text"
              name="id"
              value={updateInfo.id ? updateInfo.id : ''}
              disabled={true}
              onChange={handleChange}
            />
          </label>
        </div>

        <div>
          <label>
            Name:
            <input
              type="text"
              name="name"
              value={updateInfo.name ? updateInfo.name : ''}
              disabled={true}
              onChange={handleChange}
            />
          </label>
        </div>

        <div>
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={updateInfo.email ? updateInfo.email : ''}
              onChange={handleChange}
            />
          </label>
        </div>

        <div>
          <label>
            Phone:
            <input
              type="tel"
              name="phone"
              value={updateInfo.phone ? updateInfo.phone : ''}
              onChange={handleChange}
            />
          </label>
        </div>

        <div>
          <label>
            기본 팀:
            <select
              name="default_team_id"
              value={defaultTeamId || ''}
              onChange={handleDefaultTeamChange}
            >
              {myTeams && myTeams.length > 0 ? (
                myTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} {team.is_default === 1 ? '(기본)' : ''}
                  </option>
                ))
              ) : (
                <option value="">팀이 없습니다</option>
              )}
            </select>
          </label>
        </div>

        <div>
          <button type="submit">수정</button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
