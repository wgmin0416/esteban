import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import LoginButtons from '../../components/login/LoginButtons';

const LoginPage = () => {
  const setIsLogin = useAuthStore((state) => state.setIsLogin);
  const getMyInfo = useAuthStore((state) => state.getMyInfo);
  const requestGoogleLogin = useAuthStore((state) => state.requestGoogleLogin);
  const requestNaverLogin = useAuthStore((state) => state.requestNaverLogin);
  const requestKakaoLogin = useAuthStore((state) => state.requestKakaoLogin);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = async (event) => {
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
        console.log('LoginPage 로그인 성공 후 내 정보 조회');
        await getMyInfo();
        navigate('/');
      } else if (event.data?.type === 'LOGIN_FAILURE') {
        // 로그인 실패
        alert('로그인에 실패했습니다.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  return (
    <>
      <LoginButtons
        requestGoogleLogin={requestGoogleLogin}
        requestNaverLogin={requestNaverLogin}
        requestKakaoLogin={requestKakaoLogin}
      />
    </>
  );
};

export default LoginPage;
