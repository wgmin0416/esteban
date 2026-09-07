import './App.scss';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
// component
import Header from './components/layout/header/Header';
import Footer from './components/layout/footer/Footer';
import BottomTabBar from './components/layout/mobile/BottomTabBar';
import AppRoutes from './AppRoutes';
import Toast from './components/common/Toast';
import AlertModal from './components/common/AlertModal';
import ConfirmModal from './components/common/ConfirmModal';
import useAuthStore from './store/useAuthStore';
import { isNative } from './lib/auth/platform';
function App() {
  const { getMyInfo, myInfo } = useAuthStore();
  const isLogin = useAuthStore((state) => state.isLogin);

  // 앱 로딩 시 한 번만 로그인 상태 체크
  useEffect(() => {
    console.log('App.jsx 14: useEffect 내 getMyInfo 실행');
    getMyInfo();
    console.log('myInfo: ', myInfo);
  }, []);

  // 네이티브 앱이면 body에 클래스 부여 → 모바일 레이아웃(하단 탭바 등) 강제 적용
  useEffect(() => {
    if (isNative()) {
      document.body.classList.add('is-native');
    }
  }, []);

  return (
    <Router>
      {/* 로그인 필수 앱: 로그인 상태에서만 헤더/푸터/하단탭 노출 (로그인 화면은 크롬 없이) */}
      {isLogin && <Header />}
      <AppRoutes />
      {isLogin && <Footer />}
      {isLogin && <BottomTabBar />}
      <Toast />
      <AlertModal />
      <ConfirmModal />
    </Router>
  );
}

export default App;
