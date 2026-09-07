import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { setNavigator } from './lib/navigation';
// page
import LoginPage from './pages/user/LoginPage';
import ProfilePage from './pages/user/ProfilePage';
import AuthPage from './pages/auth/AuthPage';

// locker room page
import LockerRoomHomePage from './pages/lockerroom/LockerRoomHomePage';
import RankingsPage from './pages/lockerroom/RankingsPage';
import RecordsPage from './pages/lockerroom/RecordsPage';
import RecordForm from './pages/lockerroom/RecordForm';
import LiveSetupPage from './pages/lockerroom/LiveSetupPage';
import LiveTrackingPage from './pages/lockerroom/LiveTrackingPage';
import MatchesPage from './pages/lockerroom/MatchesPage';
import MatchDetailPage from './pages/lockerroom/MatchDetailPage';
import BoardPage from './pages/lockerroom/BoardPage';
import ManagementPage from './pages/lockerroom/ManagementPage';
import DuesHistoryPage from './pages/lockerroom/DuesHistoryPage';

// join recruit page
import MemberRecruitment from './pages/joinRecruit/MemberRecruitment';
import MemberRecruitmentForm from './pages/joinRecruit/MemberRecruitmentForm';
import MemberRecruitmentDetail from './pages/joinRecruit/MemberRecruitmentDetail';

// match board page
import MatchBoardPage from './pages/matchBoard/MatchBoard';
import MatchBoardForm from './pages/matchBoard/MatchBoardForm';
import MatchBoardDetail from './pages/matchBoard/MatchBoardDetail';

// court board page
import CourtBoardPage from './pages/courtBoard/CourtBoardPage';
import CourtBoardForm from './pages/courtBoard/CourtBoardForm';
import CourtBoardDetail from './pages/courtBoard/CourtBoardDetail';

// error page
import NotfoundPage from './pages/error/NotfoundPage';
// team page
import CreateTeamPage from './pages/team/CreateTeamPage';
// store
import useAuthStore from './store/useAuthStore';
// protected route
import ProtectedRoute from './pages/ProtectedRoute';

function AppRoutes() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
  }, [navigate]);

  const isLogin = useAuthStore((state) => state.isLogin);
  const isAuthChecking = useAuthStore((state) => state.isAuthChecking);

  return (
    <Routes>
      {/* 홈 탭 제거 → 로그인 후 '우리 팀'으로 바로 진입 */}
      <Route path="/" element={<Navigate to="/locker-room" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-team"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <CreateTeamPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/team/members"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <MemberPage />
          </ProtectedRoute>
        }
      /> */}
      {/* Locker Room */}
      <Route
        path="/locker-room"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <LockerRoomHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/rankings"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <RankingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/records"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <RecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/matches"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MatchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/matches/:matchId"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MatchDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/matches/:matchId/live-setup"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <LiveSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/matches/:matchId/live"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <LiveTrackingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/matches/:matchId/record"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <RecordForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/team-board"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/management"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <ManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/management/dues"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <DuesHistoryPage />
          </ProtectedRoute>
        }
      />

      {/* recruit */}
      <Route
        path="/recruit"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MemberRecruitment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruit/create"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MemberRecruitmentForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruit/edit/:id"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MemberRecruitmentForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruit/:id"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MemberRecruitmentDetail />
          </ProtectedRoute>
        }
      />

      {/* match board */}
      <Route
        path="/match-board"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MatchBoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/match-board/create"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MatchBoardForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/match-board/edit/:id"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MatchBoardForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/match-board/:id"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <MatchBoardDetail />
          </ProtectedRoute>
        }
      />

      {/* court board */}
      <Route
        path="/court-board"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <CourtBoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/court-board/create"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <CourtBoardForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/court-board/edit/:id"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <CourtBoardForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/court-board/:id"
        element={
          <ProtectedRoute isAuthenticated={isLogin} isAuthChecking={isAuthChecking}>
            <CourtBoardDetail />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
