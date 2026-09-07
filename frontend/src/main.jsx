import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { APP_NAME } from './config/brand';

// 브라우저 탭 타이틀도 브랜드 상수 기반 (index.html title을 덮어씀)
document.title = APP_NAME;

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <App />
  // </StrictMode>,
);
