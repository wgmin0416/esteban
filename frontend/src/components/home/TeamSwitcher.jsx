import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import './TeamSwitcher.scss';

const CREATE = '__create__';

// 헤더 전역 팀 전환 Select (활성 팀 = 서버의 기본 팀)
const TeamSwitcher = () => {
  const myTeams = useTeamStore((s) => s.myTeams);
  const getMyTeams = useTeamStore((s) => s.getMyTeams);
  const setDefaultTeam = useTeamStore((s) => s.setDefaultTeam);
  const navigate = useNavigate();

  useEffect(() => {
    if (myTeams === null) getMyTeams();
  }, [myTeams, getMyTeams]);

  // 팀이 없으면 '팀 만들기'만 노출
  if (!myTeams || myTeams.length === 0) {
    return (
      <button
        type="button"
        className="team-switcher team-switcher--create"
        onClick={() => navigate('/create-team')}
      >
        ＋ 팀 만들기
      </button>
    );
  }

  const current = myTeams.find((t) => t.is_default === 1)?.id ?? myTeams[0].id;

  const handleChange = async (e) => {
    const value = e.target.value;
    if (value === CREATE) {
      navigate('/create-team');
      return;
    }
    const id = Number(value);
    if (id !== current) {
      await setDefaultTeam(id);
    }
  };

  return (
    <div className="team-switcher">
      <select
        className="team-switcher__select"
        value={current}
        onChange={handleChange}
        aria-label="팀 선택"
      >
        {myTeams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
        <option value={CREATE}>＋ 새 팀 만들기</option>
      </select>
      <span className="team-switcher__arrow" aria-hidden="true">▾</span>
    </div>
  );
};

export default TeamSwitcher;
