import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const heroSlides = [
  {
    badge: '熱門市場',
    title: '預測未來',
    text: '透過市場價格反映真實世界機率',
    primary: '開始交易',
    secondary: '查看市場',
    secondaryPath: '/home#markets',
  },
  {
    badge: '加密市場',
    title: 'BTC 200K',
    text: '預測比特幣是否突破歷史新高',
    primary: '立即參與',
    secondary: '查看走勢',
    secondaryPath: '/home#markets',
  },
  {
    badge: '交易系統',
    title: 'UCMARKET',
    text: '買入、賣出、持倉、結算一次完成',
    primary: '進入交易',
    secondary: '查看排行榜',
    secondaryPath: '/rankings',
  },
];

export default function LandingPage() {
  const [slideIndex, setSlideIndex] = useState(0);
  const slide = heroSlides[slideIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((index) => (index + 1) % heroSlides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="landing-hero">
      <div className="landing-ticker-layer" aria-hidden="true">
        {[1, 2, 3].map((row) => (
          <div className={`landing-ticker-row landing-row-${row}`} key={row}>
            <span>UCMARKET</span>
            <span>UCMARKET</span>
            <span>UCMARKET</span>
            <span>UCMARKET</span>
          </div>
        ))}
      </div>

      <div className="landing-hero-slider">
        <div className="landing-slide" key={slide.title}>
          <span className="landing-badge">{slide.badge}</span>
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>

          <div className="landing-hero-buttons">
            <Link to="/home" className="landing-primary-btn">{slide.primary}</Link>
            <Link to={slide.secondaryPath} className="landing-secondary-btn">{slide.secondary}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
