import { useState } from 'react';
import './NotificationBell.scss';

// 상단바 알림 벨 (v1 스텁 — TODO: 알림 API 연동)
const NotificationBell = () => {
  const [open, setOpen] = useState(false);

  // TODO: 실제 알림 목록/읽음상태 API로 대체
  const items = [
    { id: 1, icon: '📅', text: '다음 경기 참석 투표가 시작됐어요', time: '방금' },
    { id: 2, icon: '💰', text: '7월 회비가 등록되었습니다', time: '2시간 전' },
    { id: 3, icon: '📢', text: '팀 공지: 이번 주 훈련 장소 변경', time: '어제' },
  ];
  const unread = items.length;

  return (
    <div className="notif-bell">
      <button
        className="notif-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-dropdown">
            <div className="notif-head">알림</div>
            <ul className="notif-list">
              {items.map((it) => (
                <li key={it.id}>
                  <span className="ni-icon">{it.icon}</span>
                  <span className="ni-text">{it.text}</span>
                  <span className="ni-time">{it.time}</span>
                </li>
              ))}
            </ul>
            <div className="notif-foot">모두 읽음</div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
