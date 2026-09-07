import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ isAuthenticated, isAuthChecking, children }) {
  const location = useLocation();

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
    // 현재 경로 저장 후 로그인으로 이동 (로그인 화면이 뜨므로 별도 안내 토스트는 생략)
    sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    return <Navigate to="/login" />;
  }
  
  return children;
}

export default ProtectedRoute;
