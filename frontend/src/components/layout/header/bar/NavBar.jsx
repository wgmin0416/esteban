import './NavBar.scss';
import { NavLink, useLocation } from 'react-router-dom';

const NavBar = ({ language }) => {
  const location = useLocation();
  
  const t = {
    home: language === 'KR' ? '홈' : 'Home',

    lockerRoom: language === 'KR' ? '라커룸' : 'Locker Room',
    teamBoard: language === 'KR' ? '게시판' : 'Team Board',
    schedule: language === 'KR' ? '일정' : 'Schedule',
    rankings: language === 'KR' ? '랭킹' : 'Rankings',
    records: language === 'KR' ? '기록' : 'Records',
    teamManagement: language === 'KR' ? '팀 관리' : 'Team Management',

    joinRecruit: language === 'KR' ? '팀/팀원 찾기' : 'Join or Recruit',
    join: language === 'KR' ? '팀 구해요' : 'Join a Team',
    recruit: language === 'KR' ? '팀원 구해요' : 'Recruit Members',

    matchBoard: language === 'KR' ? '경기 모집' : 'Match Board',

    courtBoard: language === 'KR' ? '코트 대관/양도' : 'Court Board',
  };

  return (
    <nav className="nav-bar">
      <div className="nav-group">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? 'active' : ''}
          end
        >
          {t.home}
        </NavLink>
      </div>

      <div className="nav-group">
        <NavLink 
          to="/locker-room"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.lockerRoom}
        </NavLink>
      </div>

      <div className="nav-group dropdown">
        <NavLink 
          to="/join-recruit"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.joinRecruit}
        </NavLink>
      </div>

      <div className="nav-group">
        <NavLink 
          to="/match-board"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.matchBoard}
        </NavLink>
      </div>
      
      <div className="nav-group">
        <NavLink 
          to="/court-board"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.courtBoard}
        </NavLink>
      </div>
    </nav>
  );
};

export default NavBar;
