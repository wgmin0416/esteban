import { useEffect } from 'react';
import apiRequest from '../../store/apiRequest';

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

    // 2. 로그인 시 Cookie에 Access token이 있는지 B/E 검증
    // httpOnly(true) Cookie는 F/E에 존재하는지 유무 확인 불가
    // ! 해당 요청 시 token의 만료 여부는 확인하지 않음
    const tokenCheckReq = async () => {
      const tokenCheckRes = await apiRequest('get', '/user/auth-check', null, {
        withCredentials: true,
      });
      console.log('tokenCheckRes.success: ', tokenCheckRes.success);

      if (!tokenCheckRes.success) {
        window.opener.postMessage({ type: 'LOGIN_FAILURE' }, window.location.origin);
        window.close();
      } else {
        // Access token 있을 경우
        window.opener.postMessage({ type: 'LOGIN_SUCCESS' }, window.location.origin);
        window.close();
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
