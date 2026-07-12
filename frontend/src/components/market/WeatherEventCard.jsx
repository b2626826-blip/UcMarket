import { Link } from 'react-router-dom';
import { getMetricLabel } from '../../utils/weatherHelpers';
import './WeatherEventCard.css';

const STATUS_LABEL = {
  ACTIVE: '進行中', CLOSED: '已截止', RESOLVED: '已結算',
  REJECTED: '已拒絕', CANCELED: '已取消',
};

function formatCloseAt(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hh}:${mm}`;
}

export default function WeatherEventCard({ group }) {
  const isIndividual = !group.city;
  const icon = isIndividual ? 'fa-cloud' : (group.metric === 'monthlyRain' ? 'fa-cloud-rain' : 'fa-cloud-sun');

  return (
    <Link className="weather-event-card" to={`/markets/weather/${group.id}`}>
      <article>
        <div className="weather-event-card__heading">
          <div className="weather-event-card__media">
            <span><i className={`fa-solid ${icon}`}></i></span>
          </div>
          <div className="weather-event-card__summary">
            <div className="weather-event-card__tags">
              <span>天氣</span>
              {isIndividual ? <span>其他</span> : <><span>{group.city}</span><span>{getMetricLabel(group.metric)}</span></>}
            </div>
            <h2>{group.title}</h2>
          </div>
        </div>

        <div className="weather-event-card__probability">
          <div className="weather-event-card__probability-labels">
            <span>YES {group.yesProbability}%</span>
            <span>NO {group.noProbability}%</span>
          </div>
          <div className="weather-event-card__probability-bar">
            <span style={{ width: `${group.yesProbability}%` }} />
            <span style={{ width: `${group.noProbability}%` }} />
          </div>
        </div>

        <footer className="weather-event-card__footer">
          <span>{group.eventCount || 1} 個事件</span>
          <time dateTime={group.closeAt}>截止 {formatCloseAt(group.closeAt)}</time>
          <span className={`weather-event-card__status is-${group.status?.toLowerCase()}`}>
            {STATUS_LABEL[group.status] || group.status}
          </span>
        </footer>
      </article>
    </Link>
  );
}
