import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
// component
import Header from './components/layout/header/Header';
import Footer from './components/layout/footer/Footer';
import AppRoutes from './AppRoutes';
import useAuthStore from './store/useAuthStore';
function App() {
  const { getMyInfo, myInfo } = useAuthStore();

  // 앱 로딩 시 한 번만 로그인 상태 체크
  useEffect(() => {
    console.log('App.jsx 14: useEffect 내 getMyInfo 실행');
    getMyInfo();
    console.log('myInfo: ', myInfo);
  }, []);

  return (
    <Router>
      <Header />
      <AppRoutes />
      <Footer />
    </Router>
  );
}

export default App;
