import { Navigate } from 'react-router-dom';

function ProtectedRoute({ isAuthenticated, isAuthChecking, children }) {
  // 인증 체크 중이면 로딩 표시
  if (isAuthChecking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        로딩 중...
      </div>
    );
  }

  // 인증 체크 완료 후 로그인 상태 확인
  if (!isAuthenticated) {
    alert('로그인 후 이용해주세요.');
    return <Navigate to="/login" />;
  }
  
  return children;
}

export default ProtectedRoute;
