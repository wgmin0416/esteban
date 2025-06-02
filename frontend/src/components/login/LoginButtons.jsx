import React from 'react';
import './LoginButtons.css'; // 스타일 파일을 따로 만들었다고 가정할게

const LoginButtons = ({ requestGoogleLogin, requestNaverLogin, requestKakaoLogin }) => {
  return (
    <div className="social-login-container">
      <button className="social-btn google" onClick={() => requestGoogleLogin()}>
        구글 로그인
      </button>
      <button className="social-btn naver" onClick={() => requestNaverLogin()}>
        네이버 로그인
      </button>
      <button className="social-btn kakao" onClick={() => requestKakaoLogin()}>
        카카오 로그인
      </button>
    </div>
  );
};

export default LoginButtons;
