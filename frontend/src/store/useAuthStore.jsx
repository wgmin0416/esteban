import { create } from 'zustand';
import apiRequest from '../lib/apiRequest';
import { isNative } from '../lib/auth/platform';
import { buildAuthorizeUrl, buildState } from '../lib/auth/oauth';
import { loginNative } from '../lib/auth/loginNative';
import { clearAccessToken } from '../lib/auth/tokenStore';

// 웹: 팝업으로 authorize URL 오픈 (결과는 postMessage로 LoginPage가 수신)
const openWebLogin = (provider) => {
  const url = buildAuthorizeUrl(provider, buildState(false));
  window.open(url, '_blank', 'width=500,height=600');
};

const useAuthStore = create((set) => ({
  // 로그인 여부
  isLogin: false,
  setIsLogin: (status) => set({ isLogin: status }),
  // 인증 체크 중
  isAuthChecking: true,
  setIsAuthChecking: (status) => set({ isAuthChecking: status }),
  // 내 정보
  myInfo: {},
  setMyInfo: (value) =>
    set({
      myInfo: value,
    }),
  // 소셜 로그인 (웹: 팝업 / 앱: 시스템 브라우저 + 딥링크)
  // 웹은 undefined 반환(결과는 postMessage), 앱은 Promise<{type}> 반환
  requestGoogleLogin: () => (isNative() ? loginNative('google') : openWebLogin('google')),
  requestNaverLogin: () => (isNative() ? loginNative('naver') : openWebLogin('naver')),
  requestKakaoLogin: () => (isNative() ? loginNative('kakao') : openWebLogin('kakao')),
  // 로그아웃
  logout: async () => {
    try {
      const response = await apiRequest('get', '/user/logout', null, {
        withCredentials: true,
      });
      if (response.success) {
        if (isNative()) await clearAccessToken();
        set({ isLogin: false, myInfo: {} });
      }
      return;
    } catch (error) {
      // 서버 호출 실패해도 앱 로컬 토큰은 정리
      if (isNative()) await clearAccessToken();
      console.error(error);
    }
  },
  // 회원정보
  getMyInfo: async () => {
    try {
      set({ isAuthChecking: true });
      const response = await apiRequest('get', '/user/my-info', null, {
        withCredentials: true,
      });
      if (response?.data) {
        set({ isLogin: true, myInfo: response.data, isAuthChecking: false });
      } else {
        set({ isLogin: false, myInfo: {}, isAuthChecking: false });
      }
    } catch (error) {
      console.error(error);
      // 401 에러(인증 실패)일 때만 로그아웃 상태로 변경
      // 다른 에러(네트워크 등)는 기존 로그인 상태 유지
      const status = error?.response?.status;
      if (status === 401) {
        set({ isLogin: false, myInfo: {}, isAuthChecking: false });
      } else {
        // 다른 에러는 isAuthChecking만 false로 설정하고 로그인 상태는 유지
        set((state) => ({ ...state, isAuthChecking: false }));
      }
      throw error;
    }
  },
}));

export const logout = async () => {
  const store = useAuthStore.getState(); // zustand store에서 상태 직접 접근
  await store.logout(); // 실제 logout 실행
};

export default useAuthStore;
