import { useState, useEffect } from 'react';
import useAuthStore from '../../../store/useAuthStore';
import useLanguageStore from '../../../store/useLanguageStore';
// import SportTab from './bar/SportTab'; // 나중에 종목 탭 추가 시 사용
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
    <>
      {/* 나중에 종목 탭 추가 시 주석 해제 */}
      {/* <div className="sport-tab-wrapper">
        <SportTab />
      </div> */}
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
          </div>
        </header>
      </div>
      <div className="nav-sticky-wrapper">
        <div className="nav-sticky-container">
          <NavBar language={language} />
          <SubNavBar language={language} />
        </div>
      </div>
    </>
  );
};

export default Header;
