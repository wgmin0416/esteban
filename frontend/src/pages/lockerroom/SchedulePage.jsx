import { useState, useEffect } from 'react';
import useLanguageStore from '../../store/useLanguageStore';
import './SchedulePage.scss';

const SchedulePage = () => {
  const language = useLanguageStore((state) => state.language);

  // 더미 일정 데이터
  const [upcomingSchedules] = useState([
    {
      id: 1,
      date: '2024-01-15',
      time: '19:00',
      location: '강남 체육관',
      opponent: 'ABC 팀',
      status: 'pending',
    },
    {
      id: 2,
      date: '2024-01-20',
      time: '20:00',
      location: '송파 체육관',
      opponent: 'XYZ 팀',
      status: 'pending',
    },
    {
      id: 3,
      date: '2024-01-25',
      time: '18:30',
      location: '잠실 체육관',
      opponent: 'DEF 팀',
      status: 'confirmed',
    },
    {
      id: 4,
      date: '2024-02-01',
      time: '19:30',
      location: '홍대 체육관',
      opponent: 'GHI 팀',
      status: 'pending',
    },
  ]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // 캘린더 관련 함수들
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // 빈 칸 추가 (시작 요일까지)
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // 날짜 추가
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString(language === 'KR' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const getDayName = (dayIndex) => {
    const dayNames = language === 'KR' 
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[dayIndex];
  };

  const hasScheduleOnDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return upcomingSchedules.some((schedule) => schedule.date === dateStr);
  };

  const getSchedulesOnDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return upcomingSchedules.filter((schedule) => schedule.date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    if (day === null) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  const isToday = (day) => {
    if (day === null) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="schedule-page">
      <div className="container">
        <h1 className="page-title">{language === 'KR' ? '일정' : 'Schedule'}</h1>

        {/* 다가오는 일정 섹션 */}
        {upcomingSchedules.length > 0 && (
          <section className="upcoming-schedules-section">
            <h2 className="section-title">
              {language === 'KR' ? '다가오는 일정' : 'Upcoming Schedules'}
            </h2>
            <div className="schedule-grid">
              {upcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="schedule-square-card">
                  <div className="schedule-date">
                    <div className="date-day">
                      {new Date(schedule.date).getDate()}
                    </div>
                    <div className="date-month">
                      {new Date(schedule.date).toLocaleDateString(
                        language === 'KR' ? 'ko-KR' : 'en-US',
                        { month: 'short' }
                      )}
                    </div>
                  </div>
                  <div className="schedule-content">
                    <h4 className="schedule-title">
                      {language === 'KR' ? `${schedule.opponent}와의 경기` : `vs ${schedule.opponent}`}
                    </h4>
                    <div className="schedule-info">
                      <span className="schedule-time">🕐 {schedule.time}</span>
                      <span className="schedule-location">📍 {schedule.location}</span>
                    </div>
                    {schedule.status === 'pending' && (
                      <button className="btn btn-vote">
                        {language === 'KR' ? '일정 투표하기' : 'Vote'}
                      </button>
                    )}
                    {schedule.status === 'confirmed' && (
                      <span className="badge badge-confirmed">
                        {language === 'KR' ? '확정' : 'Confirmed'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 캘린더 섹션 */}
        <section className="calendar-section">
          <div className="calendar-header">
            <button className="btn btn-nav" onClick={handlePrevMonth}>
              ←
            </button>
            <h2 className="calendar-month">{getMonthName(currentMonth)}</h2>
            <button className="btn btn-nav" onClick={handleNextMonth}>
              →
            </button>
          </div>

          <div className="calendar">
            <div className="calendar-weekdays">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                <div key={dayIndex} className="weekday">
                  {getDayName(dayIndex)}
                </div>
              ))}
            </div>
            <div className="calendar-days">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="calendar-day empty"></div>;
                }

                const date = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  day
                );
                const hasSchedule = hasScheduleOnDate(date);
                const isSelected =
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();

                return (
                  <div
                    key={day}
                    className={`calendar-day ${isToday(day) ? 'today' : ''} ${
                      hasSchedule ? 'has-schedule' : ''
                    } ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleDateClick(day)}
                  >
                    <span className="day-number">{day}</span>
                    {hasSchedule && <span className="schedule-dot"></span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 선택된 날짜의 일정 상세 */}
          {selectedDate && getSchedulesOnDate(selectedDate).length > 0 && (
            <div className="selected-date-schedules">
              <h3>
                {selectedDate.toLocaleDateString(
                  language === 'KR' ? 'ko-KR' : 'en-US',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }
                )}
              </h3>
              <div className="schedule-list">
                {getSchedulesOnDate(selectedDate).map((schedule) => (
                  <div key={schedule.id} className="schedule-item">
                    <div className="schedule-time">{schedule.time}</div>
                    <div className="schedule-details">
                      <div className="schedule-title">
                        {language === 'KR' ? `${schedule.opponent}와의 경기` : `vs ${schedule.opponent}`}
                      </div>
                      <div className="schedule-location">📍 {schedule.location}</div>
                    </div>
                    {schedule.status === 'pending' && (
                      <button className="btn btn-vote btn-sm">
                        {language === 'KR' ? '투표' : 'Vote'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SchedulePage;
