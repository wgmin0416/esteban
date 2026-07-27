import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import LoginButtons from '../../components/login/LoginButtons';
import { toastError, toastSuccess } from '../../utils/alert';
import { isNative } from '../../lib/auth/platform';
import { DEV_LOGIN, devLogin } from '../../lib/auth/devLogin';

const LoginPage = () => {
  const setIsLogin = useAuthStore((state) => state.setIsLogin);
  const getMyInfo = useAuthStore((state) => state.getMyInfo);
  const requestGoogleLogin = useAuthStore((state) => state.requestGoogleLogin);
  const requestNaverLogin = useAuthStore((state) => state.requestNaverLogin);
  const requestKakaoLogin = useAuthStore((state) => state.requestKakaoLogin);
  const navigate = useNavigate();

  // 로그인 성공 후 공통 처리 (웹/앱 공용)
  const onLoginSuccess = async () => {
    setIsLogin(true);
    await getMyInfo();
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    } else {
      navigate('/');
    }
  };

  // 웹: 팝업(AuthPage)의 결과를 postMessage로 수신
  useEffect(() => {
    if (isNative()) return; // 앱은 딥링크 방식이라 message 리스너 불필요
    const handleMessage = async (event) => {
      // 무관한 origin의 메시지는 무시 (기존: return 누락으로 오작동하던 버그 수정)
      if (event.origin !== import.meta.env.VITE_FRONT_URL) return;

      if (event.data?.type === 'JOIN_SUCCESS') {
        toastSuccess('회원 가입되었습니다. 로그인 후 이용해주세요.');
        navigate('/login');
      } else if (event.data?.type === 'LOGIN_SUCCESS') {
        await onLoginSuccess();
      } else if (event.data?.type === 'LOGIN_FAILURE') {
        toastError('로그인에 실패했습니다.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // 클릭 핸들러: 웹은 팝업만 열고(결과는 리스너), 앱은 Promise 결과를 직접 처리
  const handleSocialLogin = (requestFn) => async () => {
    if (!isNative()) {
      requestFn();
      return;
    }
    try {
      const result = await requestFn();
      if (result?.type === 'join') {
        toastSuccess('회원 가입되었습니다. 로그인 후 이용해주세요.');
      } else if (result?.type === 'login') {
        await onLoginSuccess();
      }
    } catch (err) {
      console.error(err);
      toastError('로그인에 실패했습니다.');
    }
  };

  // 개발용 테스트 계정 로그인
  const handleDevLogin = async () => {
    try {
      await devLogin();
      await onLoginSuccess();
    } catch (err) {
      console.error(err);
      toastError('테스트 로그인에 실패했습니다.');
    }
  };

  return (
    <>
      <LoginButtons
        requestGoogleLogin={handleSocialLogin(requestGoogleLogin)}
        requestNaverLogin={handleSocialLogin(requestNaverLogin)}
        requestKakaoLogin={handleSocialLogin(requestKakaoLogin)}
      />
      {DEV_LOGIN && (
        <div className="dev-login">
          <button type="button" onClick={handleDevLogin} className="dev-login-btn">
            🧪 테스트 계정으로 로그인
          </button>
        </div>
      )}
    </>
  );
};

export default LoginPage;
