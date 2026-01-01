import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useTeamStore from '../../store/useTeamStore';

const LockerRoomHomePage = () => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const myTeams = useTeamStore((state) => state.myTeams);
  const getMyTeams = useTeamStore((state) => state.getMyTeams);
  const setDefaultTeam = useTeamStore((state) => state.setDefaultTeam);

  const [showTeamSelector, setShowTeamSelector] = useState(false);

  useEffect(() => {
    getTeamInfo();
    getMyTeams();
  }, [getTeamInfo, getMyTeams]);

  const handleSetDefaultTeam = async (teamId) => {
    try {
      await setDefaultTeam(teamId);
      alert('기본 팀이 설정되었습니다.');
      setShowTeamSelector(false);
      await getTeamInfo();
    } catch (error) {
      console.error('기본 팀 설정 실패:', error);
    }
  };

  if (!teamInfo) {
    return (
      <div>
        <h1>Locker Room Home</h1>
        <p>팀 정보가 없습니다.</p>
        <Link to="/create-team">팀 만들기</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Locker Room Home</h1>
      <div>
        <div>
          <h2>팀 정보</h2>
          <button onClick={() => setShowTeamSelector(!showTeamSelector)}>
            기본 팀 설정
          </button>
          {showTeamSelector && myTeams && myTeams.length > 0 && (
            <div>
              <h3>기본 팀 선택</h3>
              {myTeams.map((team) => (
                <div key={team.id}>
                  <span>{team.name}</span>
                  {team.is_default === 1 && <span> (현재 기본 팀)</span>}
                  {team.is_default !== 1 && (
                    <button onClick={() => handleSetDefaultTeam(team.id)}>
                      기본 팀으로 설정
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p><strong>팀 ID:</strong> {teamInfo.id}</p>
          <p><strong>팀명:</strong> {teamInfo.name}</p>
          <p><strong>리더 ID:</strong> {teamInfo.leader_id}</p>
          <p><strong>종목:</strong> {teamInfo.sports}</p>
          {teamInfo.intro && <p><strong>팀 소개:</strong> {teamInfo.intro}</p>}
          {teamInfo.logo_url && (
            <div>
              <strong>로고:</strong>
              <img src={teamInfo.logo_url} alt="팀 로고" style={{ maxWidth: '200px' }} />
            </div>
          )}
          <p><strong>주 활동 지역:</strong> {teamInfo.region}</p>
          {teamInfo.established_at && (
            <p><strong>창단 일시:</strong> {new Date(teamInfo.established_at).toLocaleString()}</p>
          )}
          <p><strong>공개 여부:</strong> {teamInfo.is_public === 1 ? '공개' : '비공개'}</p>
          {teamInfo.boost_promoted_at && (
            <p><strong>부스터 권유 일시:</strong> {new Date(teamInfo.boost_promoted_at).toLocaleString()}</p>
          )}
          {teamInfo.booster_expired_at && (
            <p><strong>부스터 만료일:</strong> {new Date(teamInfo.booster_expired_at).toLocaleString()}</p>
          )}
        </div>
      </div>
      <Link to="/">Home</Link>
    </div>
  );
};

export default LockerRoomHomePage;
