import { Link } from 'react-router-dom';
import {
  currentEventFilters,
  matchesCurrentEventFilter,
} from '../../config/currentEventFilters';
import { StatusLabel } from '../../types/market';

const closeAtFormatter = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Taipei',
});

function formatCloseAt(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return closeAtFormatter.format(date);
}

export default function CurrentEventMarketCard({ market }) {
  const matchedFilters = currentEventFilters.filter(
    (filter) =>
      filter.id !== 'all' &&
      matchesCurrentEventFilter(market, filter.id)
  );

  return (
    <Link
      className="current-event-market-card"
      to={`/markets/${market.id}`}
    >
      <article>
        <div className="current-event-market-card__media">
          {market.imageUrl ? (
            <img src={market.imageUrl} alt="" />
          ) : (
            <span aria-hidden="true">
              <i className="fa-solid fa-newspaper"></i>
            </span>
          )}
        </div>

        <div className="current-event-market-card__tags">
          <span>{market.category}</span>

          {matchedFilters.map((filter) => (
            <span key={filter.id}>{filter.label}</span>
          ))}
        </div>

        <h2>{market.title}</h2>

        <div
          className="current-event-market-card__probability"
          aria-label={`YES ${market.yesProbability}%，NO ${market.noProbability}%`}
        >
          <div className="current-event-market-card__probability-labels">
            <span>YES {market.yesProbability}%</span>
            <span>NO {market.noProbability}%</span>
          </div>

          <div
            className="current-event-market-card__probability-bar"
            aria-hidden="true"
          >
            <span style={{ width: `${market.yesProbability}%` }} />
            <span style={{ width: `${market.noProbability}%` }} />
          </div>
        </div>

        <footer className="current-event-market-card__footer">
          {market.volume !== null && market.volume !== undefined && (
            <span>
              交易量 {new Intl.NumberFormat('zh-TW').format(market.volume)}
            </span>
          )}

          <time dateTime={market.closeAt}>
            截止 {formatCloseAt(market.closeAt)}
          </time>

          <span>{StatusLabel[market.status] ?? market.status}</span>
        </footer>
      </article>
    </Link>
  );
}