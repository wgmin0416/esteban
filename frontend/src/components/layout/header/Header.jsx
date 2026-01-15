import { useState, useEffect } from 'react';
import useAuthStore from '../../../store/useAuthStore';
import useLanguageStore from '../../../store/useLanguageStore';
import TopBar from './bar/TopBar';
import NavBar from './bar/NavBar';
import SubNavBar from './bar/SubNavBar';
import './Header.scss';

const Header = () => {
  const myInfo = useAuthStore((state) => state.myInfo);
  const isLogin = useAuthStore((state) => state.isLogin);
  const logout = useAuthStore((state) => state.logout);
  const language = useLanguageStore((state) => state.language);
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);

  useEffect(() => {
    console.log('Header isLogin? ', isLogin);
    console.log('Header myInfo: ', myInfo);
  }, [isLogin]);

  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);

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
