import { Link } from 'react-router-dom';
import './TopBar.scss';
import useAuthStore from '../../../../store/useAuthStore';

const TopBar = ({
  isDarkMode,
  toggleTheme,
  language,
  toggleLanguage,
  isLogin,
  handleLogout,
  showUserMenu,
  toggleUserMenu,
  myInfo,
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
      <div className="logo">
        <span>🏀</span>
        <span>Esteban</span>
      </div>

      <div className="right-menu">
        <button onClick={toggleTheme}>{isDarkMode ? t.lightMode : t.darkMode}</button>
        <button onClick={toggleLanguage} className="lang-button">
          {language === 'KR' ? 'English' : '한글'}
        </button>

        {isLogin ? (
          <div className="user-menu-container">
            <Link to="/profile">{myInfo.name} 님</Link>
            <button onClick={toggleUserMenu}>▼</button>
            {showUserMenu && (
              <div className="user-menu">
                <Link to="/profile">{t.myInfo}</Link>
                <button onClick={handleLogout}>{t.logout}</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="login">{t.login}</Link>
        )}
      </div>
    </div>
  );
};

export default TopBar;
