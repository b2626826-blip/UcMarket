import { useEffect, useState } from 'react';
import financeBanner from '../../assets/trend-carousel-finance-banner.png';
import politicsBanner from '../../assets/trend-carousel-politics-banner.png';
import sportsBanner from '../../assets/trend-carousel-sports-banner.png';
import techBanner from '../../assets/trend-carousel-tech-banner.png';
import weatherBanner from '../../assets/trend-carousel-weather-banner.png';

const slides = [
  { image: politicsBanner, alt: '2026 美國期中選舉預測輪播圖', label: '政治' },
  { image: financeBanner, alt: '2026 年終資產與 Fed 利率終點預測輪播圖', label: '金融' },
  { image: sportsBanner, alt: '2026 MLB 世界大賽冠軍預測輪播圖', label: '運動' },
  { image: techBanner, alt: '2026 諾貝爾獎與 AI 技術突破預測輪播圖', label: '科技' },
  { image: weatherBanner, alt: '2026 跨年夜台北低溫與冬季氣候預測輪播圖', label: '天氣' },
];

export default function MarketTrendCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="chart-card trend-carousel trend-carousel-static">
      <div className="chart-container trend-carousel-chart trend-carousel-image-frame">
        {slides.map((slide, index) => (
          <img
            key={slide.label}
            className={`trend-carousel-image ${index === activeIndex ? 'is-active' : ''}`}
            src={slide.image}
            alt={slide.alt}
          />
        ))}

        <div className="trend-carousel-overlay">
          <div className="trend-carousel-arrows">
            <button
              type="button"
              onClick={() => setActiveIndex((index) => (index - 1 + slides.length) % slides.length)}
              aria-label="上一張輪播圖"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((index) => (index + 1) % slides.length)}
              aria-label="下一張輪播圖"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div className="trend-carousel-footer">
            <div className="trend-carousel-dots" role="tablist" aria-label="首頁預測輪播">
              {slides.map((slide, index) => (
                <button
                  type="button"
                  key={slide.label}
                  className={index === activeIndex ? 'active' : ''}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`顯示${slide.label}輪播圖`}
                  aria-selected={index === activeIndex}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
