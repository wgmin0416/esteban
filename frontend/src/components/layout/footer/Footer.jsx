import './Footer.scss';
import { APP_NAME } from '../../../config/brand';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <h2 className="footer-title">{APP_NAME}</h2>
          <p className="footer-description">
            농구 팀 관리 및 경기 모집 플랫폼
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {currentYear} {APP_NAME}. All rights reserved.</p>
        <p className="footer-copyright">
          본 사이트의 모든 콘텐츠는 저작권법의 보호를 받습니다. 무단 전재, 복사, 배포를 금지합니다.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
