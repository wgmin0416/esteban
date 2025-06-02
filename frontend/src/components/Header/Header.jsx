// Header.jsx
import React, { useState } from 'react';
import './Header.css'; // CSS 분리

export default function Header() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [language, setLanguage] = useState('KR');

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);
  const toggleLanguage = () => setLanguage(language === 'KR' ? 'EN' : 'KR');

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
    myInfo: language === 'KR' ? '내 정보' : 'My Info',
    logout: language === 'KR' ? '로그아웃' : 'Logout',
    login: language === 'KR' ? '로그인' : 'Login',
    lightMode: language === 'KR' ? '화이트 모드' : 'Light Mode',
    darkMode: language === 'KR' ? '다크 모드' : 'Dark Mode',
  };

  return (
    <header className={`header ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="top-bar">
        <div className="logo">🏀Esteban</div>

        <div className="right-menu">
          <button onClick={toggleTheme}>{isDarkMode ? t.lightMode : t.darkMode}</button>
          <button onClick={toggleLanguage} className="lang-button">
            {language === 'KR' ? 'English' : '한글'}
          </button>

          {isLoggedIn ? (
            <div className="user-menu-container">
              <button onClick={toggleUserMenu}>홍길동 ▼</button>
              {showUserMenu && (
                <div className="user-menu">
                  <a href="#">{t.myInfo}</a>
                  <a href="#">{t.logout}</a>
                </div>
              )}
            </div>
          ) : (
            <a href="#">{t.login}</a>
          )}
        </div>
      </div>

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
    </header>
  );
}
