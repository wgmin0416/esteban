import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { setNavigator } from './lib/navigation';
// page
import LoginPage from './pages/user/LoginPage';
import ProfilePage from './pages/user/ProfilePage';
import AuthPage from './pages/auth/AuthPage';
import HomePage from './pages/HomePage';

// locker room page
import LockerRoomHomePage from './pages/lockerroom/LockerRoomHomePage';
import RankingsPage from './pages/lockerroom/RankingsPage';
import RecordsPage from './pages/lockerroom/RecordsPage';
import SchedulePage from './pages/lockerroom/SchedulePage';
import BoardPage from './pages/lockerroom/BoardPage';
import ManagementPage from './pages/lockerroom/ManagementPage';

// join recruit page
import JoinRecruitPage from './pages/joinRecruit/JoinRecruit';

// match board page
import MatchBoardPage from './pages/matchBoard/MatchBoard';

// court board page
import CourtBoardPage from './pages/courtBoard/CourtBoardPage';

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

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-team"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
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
          <ProtectedRoute isAuthenticated={isLogin}>
            <LockerRoomHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/rankings"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <RankingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/records"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <RecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/schedule"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/team-board"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locker-room/management"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <ManagementPage />
          </ProtectedRoute>
        }
      />

      {/* join or recruit */}
      <Route
        path="/join-recruit"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <JoinRecruitPage />
          </ProtectedRoute>
        }
      />

      {/* match board */}
      <Route
        path="/match-board"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <MatchBoardPage />
          </ProtectedRoute>
        }
      />

      {/* court board */}
      <Route
        path="/court-board"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <CourtBoardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
