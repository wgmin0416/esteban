import apiRequest from '../apiRequest';
import { isNative } from './platform';
import { setAccessToken } from './tokenStore';

// 개발용 테스트 계정 로그인 노출 여부 (frontend/.env: VITE_DEV_LOGIN=true)
export const DEV_LOGIN = import.meta.env.VITE_DEV_LOGIN === 'true';

// OAuth 없이 테스트 계정으로 로그인 (백엔드 /user/dev-login).
// 웹은 쿠키 세션, 앱은 응답의 access_token을 저장소에 반영.
export const devLogin = async () => {
  const res = await apiRequest('post', '/user/dev-login', {}, { withCredentials: true });
  if (isNative() && res?.access_token) {
    await setAccessToken(res.access_token);
  }
  return res;
};
