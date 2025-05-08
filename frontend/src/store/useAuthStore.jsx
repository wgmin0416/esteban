import { create } from 'zustand';
import apiRequest from './apiRequest';

const useAuthStore = create((set) => ({
  // 로그인 여부
  isLogin: false,
  setIsLogin: (status) => set({ isLogin: status }),
  // 회원 정보
  userInfo: {
    id: '',
    username: '',
    email: '',
    phone: '',
  },
  setUserInfo: (value) =>
    set({
      userInfo: value,
    }),
  // 구글 로그인
  requestGoogleLogin: () => {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile',
      access_type: 'online', // referesh token 발급 안 받음
      include_granted_scopes: 'false', // 이전에 승인한 권한 중복 묻지 않기
      state: crypto.randomUUID(), // CSRF 공격 방지
      prompt: 'select_account',
    };
    const qs = new URLSearchParams(options);
    window.open(`${rootUrl}?${qs.toString()}`, '_blank', 'width=500,height=600');
  },
  // 네이버 로그인
  requestNaverLogin: () => {
    const rootUrl = 'https://nid.naver.com/oauth2.0/authorize';
    const options = {
      response_type: 'code',
      client_id: import.meta.env.VITE_NAVER_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_NAVER_REDIRECT_URL,
      state: crypto.randomUUID(),
    };
    const qs = new URLSearchParams(options);
    window.open(`${rootUrl}?${qs.toString()}`, '_blank', 'width=500,height=600');
  },
  // 카카오 로그인
  requestKakaoLogin: () => {
    const rootUrl = 'https://kauth.kakao.com/oauth/authorize';
    const options = {
      response_type: 'code',
      client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
      redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URL,
      state: crypto.randomUUID(),
    };
    const qs = new URLSearchParams(options);
    window.open(`${rootUrl}?${qs.toString()}`, '_blank', 'width=500,height=600');
  },
  // 로그아웃
  logout: async () => {
    try {
      const response = await apiRequest('get', '/user/logout', null, {
        withCredentials: true,
      });
      if (response.success) {
        set({ isLogin: false });
      }
      return;
    } catch (error) {
      console.error(error);
    }
  },
  // 회원정보
  myInfo: async () => {
    try {
      const response = await apiRequest('get', '/user/my-info', null, {
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error(error);
    }
  },
}));

export default useAuthStore;
