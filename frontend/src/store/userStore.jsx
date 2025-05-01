import { create } from 'zustand';

const userStore = create((set) => ({
  // 로그인 여부
  isLogin: false,
  setIsLogin: (value) => set({ isLogin: value }),
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
}));

export default userStore;
