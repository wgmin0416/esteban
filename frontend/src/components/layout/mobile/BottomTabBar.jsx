import { NavLink } from 'react-router-dom';
import useLanguageStore from '../../../store/useLanguageStore';
import './BottomTabBar.scss';

// 24x24 라인 아이콘 (currentColor)
const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  lockerRoom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  recruit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  ),
  matchBoard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  ),
  courtBoard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
};

const BottomTabBar = () => {
  const language = useLanguageStore((state) => state.language);

  const tabs = [
    { to: '/', end: true, key: 'home', label: language === 'KR' ? '홈' : 'Home' },
    { to: '/locker-room', key: 'lockerRoom', label: language === 'KR' ? '라커룸' : 'Locker' },
    { to: '/recruit', key: 'recruit', label: language === 'KR' ? '팀원모집' : 'Recruit' },
    { to: '/match-board', key: 'matchBoard', label: language === 'KR' ? '경기모집' : 'Matches' },
    { to: '/court-board', key: 'courtBoard', label: language === 'KR' ? '코트대관' : 'Courts' },
  ];

  return (
    <nav className="bottom-tab-bar" aria-label="주요 메뉴">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
        >
          <span className="tab-icon">{icons[tab.key]}</span>
          <span className="tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomTabBar;
