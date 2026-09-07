import './NavBar.scss';
import { NavLink, useLocation } from 'react-router-dom';

const NavBar = ({ language }) => {
  const location = useLocation();
  
  const t = {
    home: language === 'KR' ? '홈' : 'Home',

    lockerRoom: language === 'KR' ? '우리 팀' : 'Team',
    teamBoard: language === 'KR' ? '게시판' : 'Team Board',
    schedule: language === 'KR' ? '일정' : 'Schedule',
    rankings: language === 'KR' ? '랭킹' : 'Rankings',
    records: language === 'KR' ? '기록' : 'Records',
    teamManagement: language === 'KR' ? '회원 관리' : 'Members',

    joinRecruit: language === 'KR' ? '팀원모집' : 'Member Recruitment',
    join: language === 'KR' ? '팀 구해요' : 'Join a Team',
    recruit: language === 'KR' ? '팀원 구해요' : 'Recruit Members',

    matchBoard: language === 'KR' ? '매치' : 'Matches',

    courtBoard: language === 'KR' ? '코트' : 'Courts',
  };

  return (
    <nav className="nav-bar">
      <div className="nav-group">
        <NavLink
          to="/locker-room"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.lockerRoom}
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
