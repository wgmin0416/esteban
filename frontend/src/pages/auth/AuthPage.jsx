import { useEffect } from 'react';
import apiRequest from '../../lib/apiRequest';

const AuthPage = () => {
  useEffect(() => {
    // 1. 소셜 회원가입 후 로그인 하는 경우
    const query = new URLSearchParams(window.location.search);
    const message = query.get('message');
    if (message && message === 'join') {
      window.opener.postMessage({ type: 'JOIN_SUCCESS' }, window.location.origin);
      window.close();
      return;
    }

    // 2. 로그인 시 /user/my-info API를 통해 인증 여부 검증(auth middleware)
    const tokenCheckReq = async () => {
      try {
        const tokenCheckRes = await apiRequest('get', '/user/my-info', null, {
          withCredentials: true,
        });
        console.log('tokenCheckRes.success: ', tokenCheckRes.success);

        if (!tokenCheckRes.success) {
          window.opener.postMessage({ type: 'LOGIN_FAILURE' }, window.location.origin);
        } else {
          // Access token 있을 경우
          window.opener.postMessage({ type: 'LOGIN_SUCCESS' }, window.location.origin);
        }
        setTimeout(() => {
          window.close();
        }, 100);
      } catch (err) {
        // 실패 시에도 메시지 전송 후 닫기
        window.opener.postMessage({ type: 'LOGIN_FAILURE' }, window.location.origin);
        setTimeout(() => {
          window.close();
        }, 100); // 100ms만으로도 충분
      }
    };
    tokenCheckReq();
  }, []);
  return (
    <>
      <div>
        <p>로그인 중입니다...</p>
      </div>
    </>
  );
};

export default AuthPage;
