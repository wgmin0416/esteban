import './NavBar.css';
import { Link } from 'react-router-dom';

const NavBar = ({ language }) => {
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
        <Link to="/">{t.home}</Link>
      </div>

      <div className="nav-group dropdown">
        <Link to="/locker-room">{t.lockerRoom}</Link>
        <div className="dropdown-menu">
          <Link to="/locker-room/rankings">{t.rankings}</Link>
          <Link to="/locker-room/records">{t.records}</Link>
          <Link to="/locker-room/schedule">{t.schedule}</Link>
          <Link to="/locker-room/team-board">{t.teamBoard}</Link>
          <Link to="/locker-room/management">{t.teamManagement}</Link>
        </div>
      </div>

      <div className="nav-group dropdown">
        <Link to="/join-recruit">{t.joinRecruit}</Link>
      </div>

      <Link to="/match-board" className="nav-group">
        {t.matchBoard}
      </Link>
      <Link to="/court-board" className="nav-group">
        {t.courtBoard}
      </Link>
    </nav>
  );
};

export default NavBar;
