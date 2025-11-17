import { Navigate } from 'react-router-dom';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    alert('로그인 후 이용해주세요.');
    return <Navigate to="/login" />;
  }
  return children;
}

export default ProtectedRoute;
