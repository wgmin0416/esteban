import { useEffect } from 'react';
import useTeamStore from '../store/useTeamStore';

/**
 * 팀 정보가 없을 때 체크하는 커스텀 훅
 * @param {Function} onNoTeam - 팀이 없을 때 실행할 콜백
 * @returns {Object} { teamInfo, isLoading }
 */
export const useTeamCheck = (onNoTeam = null) => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);

  useEffect(() => {
    getTeamInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!teamInfo && onNoTeam) {
      onNoTeam();
    }
  }, [teamInfo, onNoTeam]);

  return { teamInfo, isLoading: teamInfo === null };
};
