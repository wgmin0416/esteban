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
    matches: language === 'KR' ? '경기' : 'Matches',
    teamBoard: language === 'KR' ? '게시판' : 'Team Board',
    teamManagement: language === 'KR' ? '회원 관리' : 'Members',
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
          to="/locker-room/matches"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.matches}
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
          to="/locker-room/team-board"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.teamBoard}
        </NavLink>
      </div>

      {/* 관리자 전용: 회원 관리 (탭이 아닌 별도 버튼) */}
      {canManageTeam && (
        <NavLink
          to="/locker-room/management"
          className={({ isActive }) => `sub-nav-admin${isActive ? ' active' : ''}`}
        >
          <span className="sna-icon" aria-hidden="true">⚙</span>
          {t.teamManagement}
        </NavLink>
      )}
    </nav>
  );
};

export default SubNavBar;
