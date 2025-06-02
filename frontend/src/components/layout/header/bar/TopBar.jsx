import React from 'react';
import './Topbar.css';

const TopBar = ({
  isDarkMode,
  toggleTheme,
  language,
  toggleLanguage,
  isLoggedIn,
  showUserMenu,
  toggleUserMenu,
}) => {
  const t = {
    login: language === 'KR' ? '로그인' : 'Login',
    logout: language === 'KR' ? '로그아웃' : 'Logout',
    myInfo: language === 'KR' ? '내 정보' : 'My Info',
    lightMode: language === 'KR' ? '화이트 모드' : 'Light Mode',
    darkMode: language === 'KR' ? '다크 모드' : 'Dark Mode',
  };

  return (
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
  );
};

export default TopBar;
