import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// component
import ProtectedRoute from './components/ProtectedRoute';
// page
import LoginPage from './pages/user/LoginPage';
import ProfilePage from './pages/user/ProfilePage';
import NotfoundPage from './pages/error/NotfoundPage';
import AuthPage from './pages/auth/AuthPage';
import HomePage from './pages/HomePage';
// store
import useAuthStore from './store/useAuthStore';

function App() {
  const { isLogin } = useAuthStore((state) => state.isLogin);
  let isAuthenticated = isLogin;

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotfoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
