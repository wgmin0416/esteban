import './SubNavBar.scss';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../../../../store/useAuthStore';
import useTeamStore from '../../../../store/useTeamStore';

const SubNavBar = ({ language }) => {
  const location = useLocation();
  const isLockerRoom = location.pathname.startsWith('/locker-room');
  const myInfo = useAuthStore((state) => state.myInfo);
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const [canManageTeam, setCanManageTeam] = useState(false);

  useEffect(() => {
    if (isLockerRoom) {
      getTeamInfo();
    }
  }, [isLockerRoom, getTeamInfo]);

  useEffect(() => {
    // 권한 체크: admin, developer, 또는 team의 leader/manager
    const checkPermission = () => {
      // admin 또는 developer인 경우
      if (myInfo?.role === 'admin' || myInfo?.role === 'developer') {
        setCanManageTeam(true);
        return;
      }

      // team의 leader 또는 manager인 경우
      if (teamInfo?.role && ['leader', 'manager'].includes(teamInfo.role)) {
        setCanManageTeam(true);
        return;
      }

      setCanManageTeam(false);
    };

    checkPermission();
  }, [myInfo, teamInfo]);

  if (!isLockerRoom) {
    return null;
  }

  const t = {
    rankings: language === 'KR' ? '랭킹' : 'Rankings',
    records: language === 'KR' ? '기록' : 'Records',
    schedule: language === 'KR' ? '일정' : 'Schedule',
    teamBoard: language === 'KR' ? '게시판' : 'Team Board',
    teamManagement: language === 'KR' ? '팀 관리' : 'Team Management',
  };

  return (
    <nav className="sub-nav-bar">
      <div className="sub-nav-container">
        <NavLink 
          to="/locker-room"
          className={({ isActive }) => isActive ? 'active' : ''}
          end
        >
          홈
        </NavLink>
        <NavLink 
          to="/locker-room/rankings"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.rankings}
        </NavLink>
        <NavLink 
          to="/locker-room/records"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.records}
        </NavLink>
        <NavLink 
          to="/locker-room/schedule"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.schedule}
        </NavLink>
        <NavLink 
          to="/locker-room/team-board"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.teamBoard}
        </NavLink>
        {canManageTeam && (
          <NavLink 
            to="/locker-room/management"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            {t.teamManagement}
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default SubNavBar;
