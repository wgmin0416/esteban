import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.origin === import.meta.env.VITE_FRONT_URL) {
        alert('잘못된 요청입니다.');
        navigate('/login');
      }
      if (event.data?.status === 'join') {
        alert(event.data.message);
        navigate('/login');
      } else if (event.data?.status === 'login') {
        navigate('/');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleLogin = (provider) => {
    if (provider === 'google') {
      const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const options = {
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online', // referesh token 발급 안 받음
        include_granted_scopes: 'false', // 이전에 승인한 권한 중복 묻지 않기
        state: crypto.randomUUID(), // CSRF 공격 방지
        prompt: 'select_account',
      };
      const qs = new URLSearchParams(options);
      window.open(`${rootUrl}?${qs.toString()}`, '_blank', 'width=500,height=600');
    } else if (provider === 'naver') {
      const rootUrl = 'https://nid.naver.com/oauth2.0/authorize';
      const options = {
        response_type: 'code',
        client_id: import.meta.env.VITE_NAVER_CLIENT_ID,
        redirect_uri: import.meta.env.VITE_NAVER_REDIRECT_URL,
        state: crypto.randomUUID(),
      };
      const qs = new URLSearchParams(options);
      window.open(`${rootUrl}?${qs.toString()}`, '_blank', 'width=500,height=600');
    } else if (provider === 'kakao') {
      const rootUrl = 'https://kauth.kakao.com/oauth/authorize';
      const options = {
        response_type: 'code',
        client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
        redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URL,
        state: crypto.randomUUID(),
      };
      const qs = new URLSearchParams(options);
      window.open(`${rootUrl}?${qs.toString()}`, '_blank', 'width=500,height=600');
    }
  };
  return (
    <>
      <div>
        <Link to="/">Home</Link>
        <h1>login</h1>
        <div>
          <h1>로그인</h1>
          <button onClick={() => handleLogin('google')}>구글 로그인</button>
          <button onClick={() => handleLogin('naver')}>네이버 로그인</button>
          <button onClick={() => handleLogin('kakao')}>카카오 로그인</button>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
