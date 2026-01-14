import { useState, useEffect } from 'react';
import useAuthStore from '../../../store/useAuthStore';
import TopBar from './bar/TopBar';
import NavBar from './bar/NavBar';
import SubNavBar from './bar/SubNavBar';
import './Header.scss';

const Header = () => {
  const myInfo = useAuthStore((state) => state.myInfo);
  const isLogin = useAuthStore((state) => state.isLogin);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    console.log('Header isLogin? ', isLogin);
    console.log('Header myInfo: ', myInfo);
  }, [isLogin]);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [language, setLanguage] = useState('KR');

  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);
  const toggleLanguage = () => setLanguage(language === 'KR' ? 'EN' : 'KR');

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="header-wrapper">
      <header className="header">
        <div className="header-container">
        <TopBar
          language={language}
          toggleLanguage={toggleLanguage}
          isLogin={isLogin}
          handleLogout={handleLogout}
          showUserMenu={showUserMenu}
          toggleUserMenu={toggleUserMenu}
          myInfo={myInfo}
        />
          <NavBar language={language} />
          <SubNavBar language={language} />
        </div>
      </header>
    </div>
  );
};

export default Header;
