import { useEffect, useRef, memo } from 'react';

function buildSymbolUrl(symbol) {
  if (!symbol) {
    return 'https://www.tradingview.com/';
  }

  const [exchange, ...rest] = symbol.split(':');
  const marketSymbol = rest.join(':');
  if (!exchange || !marketSymbol) {
    return `https://www.tradingview.com/symbols/${encodeURIComponent(symbol)}/`;
  }

  return `https://www.tradingview.com/symbols/${encodeURIComponent(marketSymbol)}/?exchange=${encodeURIComponent(exchange)}`;
}

function TradingViewWidget({ symbol }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !symbol) return undefined;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = `
      {
        "allow_symbol_change": true,
        "calendar": false,
        "details": false,
        "hide_side_toolbar": true,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "D",
        "locale": "zh_TW",
        "save_image": true,
        "style": "1",
        "symbol": ${JSON.stringify(symbol)},
        "theme": "dark",
        "timezone": "Asia/Taipei",
        "backgroundColor": "#0F0F0F",
        "gridColor": "rgba(242, 242, 242, 0.06)",
        "watchlist": [],
        "withdateranges": false,
        "compareSymbols": [],
        "studies": [],
        "autosize": true
      }`;

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  if (!symbol) {
    return (
      <div
        className="tradingview-widget-container"
        style={{ height: '100%', width: '100%', display: 'grid', placeItems: 'center', color: '#8f8f8f' }}
      >
        尚未設定金融商品
      </div>
    );
  }

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: 'calc(100% - 32px)', width: '100%' }}
      ></div>
      <div className="tradingview-widget-copyright">
        <a
          href={buildSymbolUrl(symbol)}
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
