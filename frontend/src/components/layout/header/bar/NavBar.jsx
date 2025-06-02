import React from 'react';
import './NavBar.css';

const NavBar = ({ language }) => {
  const t = {
    home: language === 'KR' ? '홈' : 'Home',
    lockerRoom: language === 'KR' ? '라커룸' : 'Locker Room',
    joinRecruit: language === 'KR' ? '팀/팀원 찾기' : 'Join or Recruit',
    join: language === 'KR' ? '팀 구해요' : 'Join a Team',
    recruit: language === 'KR' ? '팀원 구해요' : 'Recruit Members',
    matchBoard: language === 'KR' ? '경기 모집' : 'Match Board',
    courtBoard: language === 'KR' ? '코트 대관/양도' : 'Court Board',
    teamBoard: language === 'KR' ? '게시판' : 'Team Board',
    schedule: language === 'KR' ? '일정' : 'Schedule',
    rankings: language === 'KR' ? '랭킹' : 'Rankings',
    records: language === 'KR' ? '기록' : 'Records',
    teamManagement: language === 'KR' ? '팀 관리' : 'Team Management',
  };

  return (
    <nav className="nav-bar">
      <div className="nav-group">
        <a href="#">{t.home}</a>
      </div>

      <div className="nav-group dropdown">
        <button>{t.lockerRoom}</button>
        <div className="dropdown-menu">
          <a href="#">{t.teamBoard}</a>
          <a href="#">{t.schedule}</a>
          <a href="#">{t.rankings}</a>
          <a href="#">{t.records}</a>
          <a href="#">{t.teamManagement}</a>
        </div>
      </div>

      <div className="nav-group dropdown">
        <button>{t.joinRecruit}</button>
        <div className="dropdown-menu">
          <a href="#">{t.join}</a>
          <a href="#">{t.recruit}</a>
        </div>
      </div>

      <a href="#" className="nav-group">
        {t.matchBoard}
      </a>
      <a href="#" className="nav-group">
        {t.courtBoard}
      </a>
    </nav>
  );
};

export default NavBar;
