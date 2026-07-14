import { useEffect, useState } from 'react';
import politicsPreview from '../../assets/trend-carousel-politics-preview.png';

const trendSlides = [
  {
    category: '\u52a0\u5bc6\u8ca8\u5e63',
    icon: 'fa-bitcoin-sign',
    title: '\u6bd4\u7279\u5e63\u6703\u5728 2027 \u5e74\u524d\u7a81\u7834 200,000 \u7f8e\u5143\u55ce\uff1f',
    subtitle: '\u5e02\u5834\u4fe1\u5fc3\u6301\u7e8c\u5347\u6eab\uff0cYES \u6a5f\u7387\u9010\u6708\u8d70\u9ad8',
  },
  {
    category: '\u91d1\u878d\u653f\u7b56',
    icon: 'fa-building-columns',
    title: 'Fed \u6703\u5728 2026 \u5e74\u5e95\u524d\u518d\u6b21\u964d\u606f\u55ce\uff1f',
    subtitle: '\u901a\u81a8\u653e\u7de9\u8207\u5c31\u696d\u6578\u64da\uff0c\u6b63\u5728\u62c9\u9ad8\u5e02\u5834\u62bc\u6ce8',
  },
  {
    category: '\u570b\u969b\u653f\u6cbb',
    icon: 'fa-landmark-flag',
    title: '2026 \u7f8e\u570b\u671f\u4e2d\u9078\u8209\u6703\u51fa\u73fe\u653f\u9ee8\u7ffb\u76e4\u55ce\uff1f',
    subtitle: '\u767d\u5bae\u8207\u570b\u6703\u89d2\u529b\u5347\u6eab\uff0c\u9078\u60c5\u6b63\u5728\u5feb\u901f\u8b8a\u5316',
  },
  {
    category: '\u9ad4\u80b2\u8cfd\u4e8b',
    icon: 'fa-basketball',
    title: '\u54ea\u4e00\u652f\u7403\u968a\u6700\u6709\u6a5f\u6703\u596a\u4e0b\u4e0b\u4e00\u5ea7 NBA \u51a0\u8ecd\uff1f',
    subtitle: '\u6230\u529b\u3001\u50b7\u75c5\u8207\u4ea4\u6613\u52d5\u614b\uff0c\u6301\u7e8c\u63a8\u52d5\u76e4\u52e2\u6ce2\u52d5',
  },
  {
    category: '\u5929\u6c23\u6c23\u5019',
    icon: 'fa-cloud-rain',
    title: '\u4eca\u5e74\u98b1\u98a8\u5b63\u6703\u51fa\u73fe\u66f4\u591a\u5f37\u70c8\u98b1\u98a8\u4fb5\u53f0\u55ce\uff1f',
    subtitle: '\u6d77\u6eab\u8207\u74b0\u6d41\u8b8a\u5316\uff0c\u8b93\u6975\u7aef\u6c23\u5019\u6a5f\u7387\u518d\u5347\u9ad8',
  },
];

const previousLabel = '\u4e0a\u4e00\u500b\u9810\u6e2c\u4e3b\u984c';
const nextLabel = '\u4e0b\u4e00\u500b\u9810\u6e2c\u4e3b\u984c';
const topicLabel = '\u9810\u6e2c\u4e3b\u984c';
const taipeiLabel = '\u53f0\u5317\u6642\u9593 (UTC+8)';
const yesLabel = 'YES \u50f9\u683c';
const noLabel = 'NO \u50f9\u683c';
const imageAlt = '2026 \u7f8e\u570b\u671f\u4e2d\u9078\u8209\u9810\u6e2c\u8f2a\u64ad\u9810\u89bd\u5716';

export default function MarketTrendCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [taipeiTime, setTaipeiTime] = useState('');
  const slide = trendSlides[activeIndex];

  useEffect(() => {
    const updateTime = () => {
      setTaipeiTime(
        new Date().toLocaleString('zh-TW', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % trendSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="chart-card trend-carousel">
      <div className="trend-carousel-header">
        <div className="chart-title">
          <div className="chart-icon">
            <i className={`fa-solid ${slide.icon}`}></i>
          </div>
          <div>
            <span className="trend-carousel-category">{slide.category}</span>
            <h2>{slide.title}</h2>
            <p>{slide.subtitle}</p>
          </div>
        </div>

        <div className="trend-carousel-arrows">
          <button
            type="button"
            onClick={() => setActiveIndex((index) => (index - 1 + trendSlides.length) % trendSlides.length)}
            aria-label={previousLabel}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex((index) => (index + 1) % trendSlides.length)}
            aria-label={nextLabel}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <div className="chart-labels">
        <span className="yes-dot">
          <i className="fa-solid fa-circle"></i> {yesLabel}
        </span>
        <span className="no-dot">
          <i className="fa-solid fa-circle"></i> {noLabel}
        </span>
      </div>

      <div className="chart-container trend-carousel-chart trend-carousel-image-frame">
        <img className="trend-carousel-image" src={politicsPreview} alt={imageAlt} />
      </div>

      <div className="trend-carousel-footer">
        <div className="trend-carousel-dots" role="tablist" aria-label={topicLabel}>
          {trendSlides.map((item, index) => (
            <button
              type="button"
              key={item.category}
              className={index === activeIndex ? 'active' : ''}
              onClick={() => setActiveIndex(index)}
              aria-label={`\u986f\u793a${item.category}\u9810\u6e2c`}
              aria-selected={index === activeIndex}
            ></button>
          ))}
        </div>

        <div className="chart-time">
          <span>{taipeiLabel}</span>
          <strong>{taipeiTime || '--'}</strong>
        </div>
      </div>
    </div>
  );
}
