// src/hooks/useAuthCheck.js
import { useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const useAuthCheck = () => {
  const { setIsLogin, logout } = useAuthStore((state) => ({
    setIsLogin: state.setIsLogin,
    logout: state.logout,
  }));

  useEffect(() => {
    console.log('userAuthCheck!!');
    const checkAuth = async () => {
      const token = Cookies.get('access_token');
      if (!token) {
        setIsLogin(false);
        set;
        logout();
        return;
      }

      try {
        const res = await axios.get('/api/v1/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setLogin(res.data); // userInfo 설정 및 isLogin = true
      } catch (err) {
        console.error('유효하지 않은 토큰입니다.', err);
        logout(); // 상태 초기화
      }
    };

    checkAuth();
  }, []);
};

export default useAuthCheck;
