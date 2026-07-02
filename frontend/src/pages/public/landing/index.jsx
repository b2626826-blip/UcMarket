import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const landingSlides = [
  {
    badge: '熱門市場',
    title: '預測未來',
    text: '掌握全球熱門事件，用你的判斷參與市場。',
    primary: '探索市場',
    secondary: '查看趨勢',
  },
  {
    badge: '加密市場',
    title: 'BTC 200K',
    text: '預測比特幣是否突破歷史新高',
    primary: '立即參與',
    secondary: '查看走勢',
  },
  {
    badge: '政治市場',
    title: '全球大選',
    text: '即時追蹤全球政治事件與市場共識。',
    primary: '查看市場',
    secondary: '瀏覽排行',
  },
];

export default function LandingPage() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let transitionTimer;
    const timer = setInterval(() => {
      setFading(true);
      transitionTimer = setTimeout(() => {
        setSlideIdx((index) => (index + 1) % landingSlides.length);
        setFading(false);
      }, 400);
    }, 4000);

    return () => {
      clearInterval(timer);
      clearTimeout(transitionTimer);
    };
  }, []);

  const slide = landingSlides[slideIdx];

  return (
    <section className="hero landing-hero">
      <div className="ticker-layer" aria-hidden="true">
        <div className="ticker-row row-1">BTC 200K&nbsp;&nbsp;&nbsp;ETH 10K&nbsp;&nbsp;&nbsp;SOL 500&nbsp;&nbsp;&nbsp;DOGE 1</div>
        <div className="ticker-row row-2">全球大選&nbsp;&nbsp;&nbsp;Fed 降息&nbsp;&nbsp;&nbsp;AI 趨勢&nbsp;&nbsp;&nbsp;NBA 冠軍</div>
        <div className="ticker-row row-3">熱門市場&nbsp;&nbsp;&nbsp;即時賠率&nbsp;&nbsp;&nbsp;YES / NO&nbsp;&nbsp;&nbsp;交易排行</div>
      </div>

      <div className="hero-slider">
        <div className="slide" key={slideIdx} style={{ opacity: fading ? 0 : 1, transition: 'opacity .6s ease' }}>
          <span className="badge">{slide.badge}</span>
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>
          <div className="hero-buttons">
            <Link to="/markets" className="primary-btn">{slide.primary}</Link>
            <Link to={slideIdx === 2 ? '/rankings' : '/markets'} className="secondary-btn">{slide.secondary}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
