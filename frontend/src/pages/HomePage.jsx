import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import './HomePage.scss';

const HomePage = () => {
  const isLogin = useAuthStore((state) => state.isLogin);
  const [currentSlide, setCurrentSlide] = useState(0);

  // 더미 광고 이미지 데이터 (실제로는 props나 API에서 받아올 예정)
  const slides = [
    {
      id: 1,
      image: 'https://via.placeholder.com/1200x400/646cff/ffffff?text=광고+이미지+1',
      title: '광고 제목 1',
      link: '#',
    },
    {
      id: 2,
      image: 'https://via.placeholder.com/1200x400/535bf2/ffffff?text=광고+이미지+2',
      title: '광고 제목 2',
      link: '#',
    },
    {
      id: 3,
      image: 'https://via.placeholder.com/1200x400/747bff/ffffff?text=광고+이미지+3',
      title: '광고 제목 3',
      link: '#',
    },
  ];

  // 3초마다 자동 슬라이드
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="home-page">
      {/* 이미지 슬라이드 섹션 */}
      <section className="home-slider">
        <div className="slider-container">
          <div
            className="slider-wrapper"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {slides.map((slide) => (
              <div key={slide.id} className="slide">
                <img src={slide.image} alt={slide.title} />
                <div className="slide-overlay">
                  <h2 className="slide-title">{slide.title}</h2>
                </div>
              </div>
            ))}
          </div>

          {/* 이전/다음 버튼 */}
          <button className="slider-btn slider-btn-prev" onClick={goToPrevSlide}>
            ‹
          </button>
          <button className="slider-btn slider-btn-next" onClick={goToNextSlide}>
            ›
          </button>

          {/* 인디케이터 */}
          <div className="slider-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`슬라이드 ${index + 1}로 이동`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 메인 컨텐츠 */}
      <section className="home-content">
        <div className="container">
          {!isLogin ? (
            <div className="login-prompt">
              <h2>로그인 후 이용 바랍니다</h2>
              <Link to="/login" className="btn btn-primary">
                로그인하기
              </Link>
            </div>
          ) : (
            <div className="quick-links">
              <h2>빠른 메뉴</h2>
              <div className="quick-links-grid">
                <Link to="/profile" className="quick-link-card">
                  <div className="quick-link-icon">👤</div>
                  <h3>프로필</h3>
                </Link>
                <Link to="/create-team" className="quick-link-card">
                  <div className="quick-link-icon">➕</div>
                  <h3>팀 만들기</h3>
                </Link>
                <Link to="/locker-room" className="quick-link-card">
                  <div className="quick-link-icon">🏀</div>
                  <h3>라커룸</h3>
                </Link>
                <Link to="/join-recruit" className="quick-link-card">
                  <div className="quick-link-icon">🔍</div>
                  <h3>팀/팀원 찾기</h3>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
