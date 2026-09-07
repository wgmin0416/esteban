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
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a2 2 0 0 1 2 2v.34c2.58.79 4.5 3.2 4.5 6.06v3.79l1.4 2.09A1 1 0 0 1 19.07 18H4.93a1 1 0 0 1-.83-1.55l1.4-2.09V10.4c0-2.86 1.92-5.27 4.5-6.06V4a2 2 0 0 1 2-2z" />
          <path d="M9.5 19.5h5a2.5 2.5 0 0 1-5 0z" />
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
