import { currentEventFilters } from '../../config/currentEventFilters';
import './CurrentEventFilterNav.css';

export default function CurrentEventFilterNav({
  activeFilterId,
  onFilterChange,
}) {
  return (
    <nav
      className="current-event-filter-nav"
      aria-label="時事分類"
    >
      {currentEventFilters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className={
            filter.id === activeFilterId
              ? 'current-event-filter-nav__button is-active'
              : 'current-event-filter-nav__button'
          }
          aria-pressed={filter.id === activeFilterId}
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </nav>
  );
}