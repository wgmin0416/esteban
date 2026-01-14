import { useState } from 'react';
import useAuthStore from '../../../store/useAuthStore';
import TopBar from './bar/TopBar';
import NavBar from './bar/NavBar';
import './Header.scss';
import { useEffect } from 'react';

const Header = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const myInfo = useAuthStore((state) => state.myInfo);
  const isLogin = useAuthStore((state) => state.isLogin);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    console.log('Header isLogin? ', isLogin);
    console.log('Header myInfo: ', myInfo);
  }, [isLogin]);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [language, setLanguage] = useState('KR');

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);
  const toggleLanguage = () => setLanguage(language === 'KR' ? 'EN' : 'KR');

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={`header ${isDarkMode ? 'dark' : 'light'}`}>
      <TopBar
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        language={language}
        toggleLanguage={toggleLanguage}
        isLogin={isLogin}
        handleLogout={handleLogout}
        showUserMenu={showUserMenu}
        toggleUserMenu={toggleUserMenu}
        myInfo={myInfo}
      />
      <NavBar language={language} />
    </header>
  );
};

export default Header;
