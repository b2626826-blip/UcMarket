import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const trendSlides = [
  {
    category: '加密貨幣',
    icon: 'fa-bitcoin-sign',
    title: '比特幣會在 2027 年前突破 200,000 美元嗎？',
    subtitle: '市場信心持續升溫，YES 機率逐月走高',
    yes: [38, 42, 45, 49, 54, 59, 63, 68, 72, 76, 79, 82],
  },
  {
    category: '金融政策',
    icon: 'fa-building-columns',
    title: 'Fed 會在 2026 年底前降息兩次以上嗎？',
    subtitle: '通膨與就業數據牽動市場降息預期',
    yes: [46, 48, 51, 55, 53, 58, 61, 64, 62, 67, 70, 73],
  },
  {
    category: '國際政治',
    icon: 'fa-landmark-flag',
    title: '共和黨會贏得下一屆美國總統大選嗎？',
    subtitle: '選情波動加劇，兩方機率持續拉鋸',
    yes: [51, 49, 52, 48, 54, 56, 53, 57, 59, 58, 61, 64],
  },
  {
    category: '體育賽事',
    icon: 'fa-basketball',
    title: '湖人隊能拿下下一屆 NBA 總冠軍嗎？',
    subtitle: '交易與傷病消息讓奪冠賠率快速變動',
    yes: [32, 35, 39, 37, 42, 46, 44, 49, 53, 51, 56, 60],
  },
  {
    category: '天氣氣候',
    icon: 'fa-cloud-rain',
    title: '本週台北降雨天數會超過三天嗎？',
    subtitle: '依最新氣象模型與市場交易即時更新',
    yes: [58, 62, 60, 66, 70, 68, 73, 77, 74, 79, 83, 86],
  },
];

export default function MarketTrendCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [taipeiTime, setTaipeiTime] = useState('');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const slide = trendSlides[activeIndex];

  useEffect(() => {
    const updateTime = () => {
      setTaipeiTime(new Date().toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
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
  }, [activeIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(217, 170, 67, 0.38)');
    gradient.addColorStop(1, 'rgba(217, 170, 67, 0)');
    const noData = slide.yes.map((value) => 100 - value);

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(context, {
      type: 'line',
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: 'YES 價格',
            data: slide.yes,
            borderColor: '#d9aa43',
            backgroundColor: gradient,
            fill: true,
            tension: 0.42,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#d9aa43',
          },
          {
            label: 'NO 價格',
            data: noData,
            borderColor: '#00d66f',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.42,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#00d66f',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111',
            titleColor: '#fff',
            bodyColor: '#d9aa43',
            borderColor: 'rgba(217,170,67,.35)',
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: {
            min: 0,
            max: 100,
            ticks: { color: '#888', callback: (value) => `${value}%` },
            grid: { color: 'rgba(255,255,255,.06)' },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [slide]);

  const showPrevious = () => {
    setActiveIndex((index) => (index - 1 + trendSlides.length) % trendSlides.length);
  };

  const showNext = () => {
    setActiveIndex((index) => (index + 1) % trendSlides.length);
  };

  return (
    <div className="chart-card trend-carousel">
      <div className="trend-carousel-header">
        <div className="chart-title">
          <div className="chart-icon"><i className={`fa-solid ${slide.icon}`}></i></div>
          <div>
            <span className="trend-carousel-category">{slide.category}</span>
            <h2>{slide.title}</h2>
            <p>{slide.subtitle}</p>
          </div>
        </div>

        <div className="trend-carousel-arrows">
          <button type="button" onClick={showPrevious} aria-label="上一個預測主題">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button type="button" onClick={showNext} aria-label="下一個預測主題">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <div className="chart-labels">
        <span className="yes-dot"><i className="fa-solid fa-circle"></i> YES 價格</span>
        <span className="no-dot"><i className="fa-solid fa-circle"></i> NO 價格</span>
      </div>

      <div className="chart-container trend-carousel-chart">
        <canvas ref={canvasRef}></canvas>
      </div>

      <div className="trend-carousel-footer">
        <div className="trend-carousel-dots" role="tablist" aria-label="預測主題">
          {trendSlides.map((item, index) => (
            <button
              type="button"
              key={item.category}
              className={index === activeIndex ? 'active' : ''}
              onClick={() => setActiveIndex(index)}
              aria-label={`顯示${item.category}預測`}
              aria-selected={index === activeIndex}
            ></button>
          ))}
        </div>

        <div className="chart-time">
          <span>台北時間 (UTC+8)</span>
          <strong>{taipeiTime || '--'}</strong>
        </div>
      </div>
    </div>
  );
}
