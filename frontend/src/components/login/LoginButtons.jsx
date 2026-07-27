import React from 'react';
import './LoginButtons.scss';

const LoginButtons = ({ requestGoogleLogin, requestNaverLogin, requestKakaoLogin }) => {
  return (
    <div className="social-login-container">
      <div className="login-header">
        <h2 className="login-title">로그인</h2>
        <p className="login-subtitle">SNS 계정으로 간편하게 로그인하세요</p>
      </div>
      <div className="social-buttons">
        <button className="social-btn google" onClick={() => requestGoogleLogin()}>
          <span className="social-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </span>
          <span className="social-text">구글 로그인</span>
        </button>
        <button className="social-btn naver" onClick={() => requestNaverLogin()}>
          <span className="social-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"
                fill="white"
              />
            </svg>
          </span>
          <span className="social-text">네이버 로그인</span>
        </button>
        <button className="social-btn kakao" onClick={() => requestKakaoLogin()}>
          <span className="social-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3C6.477 3 2 6.477 2 11c0 2.558 1.523 4.84 3.877 6.24L5.5 21l4.5-2.5c.5.05 1 .1 1.5.1 5.523 0 10-3.477 10-8s-4.477-8-10-8z"
                fill="#000000"
              />
            </svg>
          </span>
          <span className="social-text">카카오 로그인</span>
        </button>
      </div>
    </div>
  );
};

export default LoginButtons;
