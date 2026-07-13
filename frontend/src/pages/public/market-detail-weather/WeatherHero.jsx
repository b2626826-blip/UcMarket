import { useEffect } from 'react';
import './WeatherDetailPage.css';

function formatDateLabel(dateText) {
  if (!dateText) return '';
  const [, m, d] = dateText.split('-');
  return `${m}/${d}`;
}

function CurrentWeatherCard({ day, city }) {
  if (!day) return null;
  const temp = day.maxTemp != null ? day.maxTemp : 28;
  const dateLabel = day.date ? formatDateLabel(day.date) : '';
  return (
    <div className="weather-current-card">
      <div className="weather-current-main">
        <i className="fa-solid fa-cloud-sun weather-icon"></i>
        <div>
          <span className="weather-current-date">{dateLabel} {city}</span>
          <span className="weather-temp">{temp}°C</span>
          <span className="weather-condition">{day.condition}</span>
        </div>
      </div>
    </div>
  );
}

export default function WeatherHero({ subtitle, city, day }) {
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 16;
      const y = (e.clientY / window.innerHeight - 0.5) * 16;
      document.documentElement.style.setProperty('--weather-hero-x', `${x}px`);
      document.documentElement.style.setProperty('--weather-hero-y', `${y}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="weather-hero">
      <div>
        <h1 style={{ fontSize: 42 }}>天氣</h1>
        <p>{subtitle}</p>
      </div>
      {day && <CurrentWeatherCard day={day} city={city} />}
    </div>
  );
}
