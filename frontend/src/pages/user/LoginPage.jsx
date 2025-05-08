import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

const LoginPage = () => {
  const setIsLogin = useAuthStore((state) => state.setIsLogin);
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const requestGoogleLogin = useAuthStore((state) => state.requestGoogleLogin);
  const requestNaverLogin = useAuthStore((state) => state.requestNaverLogin);
  const requestKakaoLogin = useAuthStore((state) => state.requestKakaoLogin);
  const myInfo = useAuthStore((state) => state.myInfo);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event) => {
      console.log('로그인 후 LoginPage 진입');
      if (event.origin !== import.meta.env.VITE_FRONT_URL) {
        alert('잘못된 요청입니다.');
        navigate('/login');
      }
      if (event.data?.type === 'JOIN_SUCCESS') {
        // 회원가입
        alert('회원 가입되었습니다. 로그인 후 이용해주세요.');
        navigate('/login');
      } else if (event.data?.type === 'LOGIN_SUCCESS') {
        // 로그인 성공
        setIsLogin(true);
        // 회원정보 조회
        const res = myInfo();
        setUserInfo(res);
        navigate('/');
      } else if (event.data?.type === 'LOGIN_FAILURE') {
        // 로그인 실패
        alert('로그인에 실패했습니다.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  // 로그인 페이지에서
  useEffect(() => {
    console.log('로그인 페이지에서 뒤로가기 또는 로그인 후 로그인 URI로 진입했을 때');
    // 로그인 확인 API 호출
    // navigate('/'); // 이미 로그인했으면 홈으로 리다이렉트
  }, []);

  return (
    <>
      <div>
        <Link to="/">Home</Link>
        <h1>로그인</h1>
        <div>
          <button onClick={() => requestGoogleLogin()}>구글 로그인</button>
          <button onClick={() => requestNaverLogin()}>네이버 로그인</button>
          <button onClick={() => requestKakaoLogin()}>카카오 로그인</button>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
