import React, { useState } from 'react';
import TopBar from './bar/TopBar';
import NavBar from './bar/NavBar';
import './Header.css';

const Header = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [language, setLanguage] = useState('KR');

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);
  const toggleLanguage = () => setLanguage(language === 'KR' ? 'EN' : 'KR');

  return (
    <header className={`header ${isDarkMode ? 'dark' : 'light'}`}>
      <TopBar
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        language={language}
        toggleLanguage={toggleLanguage}
        isLoggedIn={isLoggedIn}
        showUserMenu={showUserMenu}
        toggleUserMenu={toggleUserMenu}
      />
      <NavBar language={language} />
    </header>
  );
};

export default Header;
