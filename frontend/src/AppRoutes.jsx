import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { setNavigator } from './lib/navigation';
// component
import LoginPage from './pages/user/LoginPage';
import ProfilePage from './pages/user/ProfilePage';
import AuthPage from './pages/auth/AuthPage';
import HomePage from './pages/HomePage';
import MemberPage from './pages/team/memberPage';
import NotfoundPage from './pages/error/NotfoundPage';
// store
import useAuthStore from './store/useAuthStore';
// protected route
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
  }, [navigate]);

  const isLogin = useAuthStore((state) => state.isLogin);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<HomePage />} />
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
      <Route path="*" element={<NotfoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
