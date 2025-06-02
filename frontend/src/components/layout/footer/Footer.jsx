import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* 회사 정보 */}
        <div className="footer-section">
          <h2 className="footer-title">MyCompany</h2>
          <p>사업자등록번호: 123-45-67890</p>
          <p>대표자: 홍길동</p>
          <p>서울특별시 강남구 테헤란로 123</p>
          <p>이메일: contact@mycompany.com</p>
        </div>

        {/* 내비게이션 */}
        <div className="footer-section">
          <h3 className="footer-subtitle">고객지원</h3>
          <ul className="footer-links">
            <li>
              <a href="/terms">이용약관</a>
            </li>
            <li>
              <a href="/privacy">개인정보 처리방침</a>
            </li>
            <li>
              <a href="/faq">자주 묻는 질문</a>
            </li>
            <li>
              <a href="/about">회사 소개</a>
            </li>
          </ul>
        </div>

        {/* 소셜 */}
        <div className="footer-section">
          <h3 className="footer-subtitle">팔로우</h3>
          <div className="social-icons">
            <a href="https://instagram.com" target="_blank">
              📸
            </a>
            <a href="https://facebook.com" target="_blank">
              📘
            </a>
            <a href="https://youtube.com" target="_blank">
              ▶️
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">© 2025 MyCompany. All rights reserved.</div>
    </footer>
  );
};

export default Footer;
