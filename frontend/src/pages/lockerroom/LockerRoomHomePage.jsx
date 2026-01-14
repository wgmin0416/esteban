import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useTeamStore from '../../store/useTeamStore';
import './LockerRoomHomePage.scss';

const LockerRoomHomePage = () => {
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const myTeams = useTeamStore((state) => state.myTeams);
  const getMyTeams = useTeamStore((state) => state.getMyTeams);
  const setDefaultTeam = useTeamStore((state) => state.setDefaultTeam);

  const [showTeamSelector, setShowTeamSelector] = useState(false);

  useEffect(() => {
    getTeamInfo();
    getMyTeams();
  }, [getTeamInfo, getMyTeams]);

  const handleSetDefaultTeam = async (teamId) => {
    try {
      await setDefaultTeam(teamId);
      alert('기본 팀이 설정되었습니다.');
      setShowTeamSelector(false);
      await getTeamInfo();
    } catch (error) {
      console.error('기본 팀 설정 실패:', error);
    }
  };

  // 더미 일정 데이터 (실제로는 props나 API에서 받아올 예정)
  const upcomingSchedules = [
    {
      id: 1,
      date: '2024-01-15',
      time: '19:00',
      location: '강남 체육관',
      opponent: 'ABC 팀',
      status: 'pending', // pending, confirmed, cancelled
    },
    {
      id: 2,
      date: '2024-01-20',
      time: '20:00',
      location: '송파 체육관',
      opponent: 'XYZ 팀',
      status: 'pending',
    },
  ];

  if (!teamInfo) {
    return (
      <div className="locker-room-page">
        <div className="container">
          <div className="empty-team-state">
            <div className="empty-icon">🏀</div>
            <h2>팀 정보가 없습니다</h2>
            <p>팀을 만들거나 팀에 가입해주세요.</p>
            <Link to="/create-team" className="btn btn-primary">
              팀 만들기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="locker-room-page">
      <div className="container">
        <h1 className="page-title">라커룸</h1>

        <div className="locker-room-content">
          {/* 팀 정보 섹션 */}
          <section className="team-info-section">
            <div className="section-header">
              <h2>팀 정보</h2>
              <button
                className="btn btn-secondary"
                onClick={() => setShowTeamSelector(!showTeamSelector)}
              >
                기본 팀 설정
              </button>
            </div>

            {showTeamSelector && myTeams && myTeams.length > 0 && (
              <div className="team-selector">
                <h3>기본 팀 선택</h3>
                <div className="team-list">
                  {myTeams.map((team) => (
                    <div
                      key={team.id}
                      className={`team-item ${team.is_default === 1 ? 'active' : ''}`}
                    >
                      <span className="team-name">{team.name}</span>
                      {team.is_default === 1 && (
                        <span className="badge badge-primary">현재 기본 팀</span>
                      )}
                      {team.is_default !== 1 && (
                        <button
                          className="btn btn-sm"
                          onClick={() => handleSetDefaultTeam(team.id)}
                        >
                          기본 팀으로 설정
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="team-info-card">
              {teamInfo.logo_url && (
                <div className="team-logo">
                  <img src={teamInfo.logo_url} alt="팀 로고" />
                </div>
              )}
              <div className="team-details">
                <h3 className="team-name">{teamInfo.name}</h3>
                <div className="team-info-grid">
                  <div className="info-item">
                    <span className="info-label">종목</span>
                    <span className="info-value">{teamInfo.sports}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">주 활동 지역</span>
                    <span className="info-value">{teamInfo.region}</span>
                  </div>
                  {teamInfo.established_at && (
                    <div className="info-item">
                      <span className="info-label">창단 일시</span>
                      <span className="info-value">
                        {new Date(teamInfo.established_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">공개 여부</span>
                    <span className="info-value">
                      {teamInfo.is_public === 1 ? '공개' : '비공개'}
                    </span>
                  </div>
                </div>
                {teamInfo.intro && (
                  <div className="team-intro">
                    <span className="info-label">팀 소개</span>
                    <p>{teamInfo.intro}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 일정 섹션 */}
          {upcomingSchedules.length > 0 && (
            <section className="schedule-section">
              <div className="section-header">
                <h2>다가오는 일정</h2>
                <Link to="/locker-room/schedule" className="btn btn-link">
                  전체 일정 보기 →
                </Link>
              </div>

              <div className="schedule-list">
                {upcomingSchedules.map((schedule) => (
                  <div key={schedule.id} className="schedule-card">
                    <div className="schedule-date">
                      <div className="date-day">
                        {new Date(schedule.date).getDate()}
                      </div>
                      <div className="date-month">
                        {new Date(schedule.date).toLocaleDateString('ko-KR', {
                          month: 'short',
                        })}
                      </div>
                    </div>
                    <div className="schedule-details">
                      <h4 className="schedule-title">
                        {schedule.opponent}와의 경기
                      </h4>
                      <div className="schedule-info">
                        <span className="schedule-time">🕐 {schedule.time}</span>
                        <span className="schedule-location">📍 {schedule.location}</span>
                      </div>
                      {schedule.status === 'pending' && (
                        <Link
                          to="/locker-room/schedule"
                          className="btn btn-primary btn-sm schedule-vote-btn"
                        >
                          일정 투표하기
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockerRoomHomePage;
