import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCurrentEventMarkets } from '../../../api/marketApi';
import { currentEventFilters } from '../../../config/currentEventFilters';
import CurrentEventFilterNav from '../../../components/market/CurrentEventFilterNav';
import './CurrentAffairsListPage.css';
import CurrentEventMarketCard from '../../../components/market/CurrentEventMarketCard';

export default function CurrentAffairsListPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const requestedFilterId = searchParams.get('filter') ?? 'all';

    const filterId = currentEventFilters.some(
        (filter) => filter.id === requestedFilterId
    )
        ? requestedFilterId
        : 'all';

    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ACTIVE');
    const [sort, setSort] = useState('popular');
    const [requestVersion, setRequestVersion] = useState(0);

    const hasKeyword = keyword.trim().length > 0;

    function handleRetry() {
        setRequestVersion((currentVersion) => currentVersion + 1);
    }

    function handleFilterChange(nextFilterId) {
        const nextSearchParams = new URLSearchParams(searchParams);

        if (nextFilterId === 'all') {
            nextSearchParams.delete('filter');
        } else {
            nextSearchParams.set('filter', nextFilterId);
        }

        setSearchParams(nextSearchParams);
    }

    function handleClearFilters() {
        setKeyword('');
        setStatus('ACTIVE');
        setSort('popular');
        handleFilterChange('all');
    }

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setError('');

        getCurrentEventMarkets({
            filterId,
            status,
            keyword,
            sort,
            page: 0,
            size: 20,
        })
            .then((result) => {
                if (!ignore) {
                    setMarkets(result.content);
                }
            })
            .catch((requestError) => {
                console.error(requestError);

                if (!ignore) {
                    setError('目前無法取得時事盤口。');
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [filterId, keyword, status, sort, requestVersion]);

    return (
        <section className="current-affairs-page">
            <div className="current-affairs-layout">
                <header className="current-affairs-header">
                    <h1>時事</h1>
                    <p>
                        追蹤國際、社會、科技、名人、電影、娛樂與八卦事件的市場共識。
                    </p>
                    <div className="current-affairs-controls">
                        <input
                            type="search"
                            value={keyword}
                            placeholder="搜尋時事盤口"
                            aria-label="搜尋時事盤口"
                            onChange={(event) => setKeyword(event.target.value)}
                        />

                        <select
                            value={status}
                            aria-label="盤口狀態"
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <option value="ACTIVE">進行中</option>
                            <option value="CLOSED">已截止</option>
                            <option value="RESOLVED">已結算</option>
                        </select>

                        <select
                            value={sort}
                            aria-label="盤口排序"
                            onChange={(event) => setSort(event.target.value)}
                        >
                            <option value="popular">熱門</option>
                            <option value="latest">最新</option>
                            <option value="closing">即將截止</option>
                        </select>
                    </div>
                </header>

                <CurrentEventFilterNav
                    activeFilterId={filterId}
                    onFilterChange={handleFilterChange}
                />

                <div className="current-affairs-results">
                    {loading && (
                        <div
                            className="current-affairs-grid"
                            aria-label="正在載入時事盤口"
                            aria-busy="true"
                        >
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    className="current-affairs-skeleton"
                                    key={index}
                                    aria-hidden="true"
                                >
                                    <div className="current-affairs-skeleton__heading">
                                        <span className="current-affairs-skeleton__media" />

                                        <div className="current-affairs-skeleton__copy">
                                            <span className="current-affairs-skeleton__tag" />
                                            <span className="current-affairs-skeleton__line" />
                                            <span className="current-affairs-skeleton__line is-short" />
                                        </div>
                                    </div>

                                    <span className="current-affairs-skeleton__probability" />
                                    <span className="current-affairs-skeleton__bar" />
                                    <span className="current-affairs-skeleton__footer" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && error && (
                        <div
                            className="current-affairs-state is-error"
                            role="alert"
                        >
                            <i
                                className="fa-solid fa-triangle-exclamation"
                                aria-hidden="true"
                            ></i>

                            <h2>時事盤口載入失敗</h2>
                            <p>{error}</p>

                            <button type="button" onClick={handleRetry}>
                                重新載入
                            </button>
                        </div>
                    )}

                    {!loading && !error && markets.length === 0 && (
                        <div className="current-affairs-state">
                            <i
                                className="fa-solid fa-magnifying-glass"
                                aria-hidden="true"
                            ></i>

                            <h2>
                                {hasKeyword
                                    ? '找不到符合條件的盤口'
                                    : '此分類目前沒有時事盤口'}
                            </h2>

                            <p>
                                {hasKeyword
                                    ? '請調整搜尋文字，或清除目前的篩選條件。'
                                    : '請切換其他分類或盤口狀態。'}
                            </p>

                            {hasKeyword && (
                                <button type="button" onClick={handleClearFilters}>
                                    清除篩選
                                </button>
                            )}
                        </div>
                    )}


                    {!loading && !error && markets.length > 0 && (
                        <div className="current-affairs-grid">
                            {markets.map((market) => (
                                <CurrentEventMarketCard
                                    key={market.id}
                                    market={market}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
