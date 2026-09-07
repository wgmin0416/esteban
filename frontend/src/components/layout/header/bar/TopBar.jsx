import { Link } from 'react-router-dom';
import './TopBar.scss';
import TeamSwitcher from '../../../home/TeamSwitcher';

// 헤더는 로그인 상태에서만 렌더됨 (App.jsx)
const TopBar = ({ language, handleLogout, showUserMenu, toggleUserMenu, myInfo }) => {
  const t = {
    logout: language === 'KR' ? '로그아웃' : 'Logout',
    myInfo: language === 'KR' ? '내 정보' : 'My Info',
  };
  const initial = (myInfo?.name || '?').trim().charAt(0) || '?';

  return (
    <div className="top-bar">
      {/* 왼쪽: 팀 전환 */}
      <div className="tb-left">
        <TeamSwitcher />
      </div>

      {/* 오른쪽: 유저 메뉴 */}
      <div className="tb-right">
        <div className="user-menu-container">
          <button type="button" className="user-trigger" onClick={toggleUserMenu} aria-haspopup="menu">
            <span className="user-avatar">
              {myInfo?.profile_image ? <img src={myInfo.profile_image} alt="" /> : initial}
            </span>
            <span className="user-name">{myInfo?.name}</span>
            <span className="caret" aria-hidden="true">▾</span>
          </button>
          {showUserMenu && (
            <div className="user-menu" role="menu">
              <Link to="/profile">{t.myInfo}</Link>
              <button onClick={handleLogout}>{t.logout}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
