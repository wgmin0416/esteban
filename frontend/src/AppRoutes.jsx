import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { setNavigator } from './lib/navigation';
// page
import LoginPage from './pages/user/LoginPage';
import ProfilePage from './pages/user/ProfilePage';
import AuthPage from './pages/auth/AuthPage';
import HomePage from './pages/HomePage';
import MemberPage from './pages/team/memberPage';

// locker room page
import LockerRoomHomePage from './pages/lockerroom/LockerRoomHomePage';
import RankingsPage from './pages/lockerroom/RankingsPage';
import RecordsPage from './pages/lockerroom/RecordsPage';
import SchedulePage from './pages/lockerroom/SchedulePage';
import BoardPage from './pages/lockerroom/BoardPage';
import ManagementPage from './pages/lockerroom/ManagementPage';

// error page
import NotfoundPage from './pages/error/NotfoundPage';
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
        path="/team/members"
        element={
          <ProtectedRoute isAuthenticated={isLogin}>
            <MemberPage />
          </ProtectedRoute>
        }
      />
      {/* Locker Room */}
      <Route path="/locker-room" element={<LockerRoomHomePage />} />
      <Route path="/locker-room/rankings" element={<RankingsPage />} />
      <Route path="/locker-room/records" element={<RecordsPage />} />
      <Route path="/locker-room/schedule" element={<SchedulePage />} />
      <Route path="/locker-room/board" element={<BoardPage />} />
      <Route path="/locker-room/management" element={<ManagementPage />} />
    </Routes>
  );
}

export default AppRoutes;
