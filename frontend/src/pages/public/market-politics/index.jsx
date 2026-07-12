import { useEffect, useMemo, useState } from "react";
import { getMarkets } from "../../../api/marketApi";
import "./MarketPolitics.css";
import bannerImg from "./politics-banner.jpg";


const PAGE_SIZE = 6;

const markets = [
  {
    id: 1,
    categories: "election usa",
    icon: "fa-solid fa-landmark",
    imgClass: "",
    title: "2028 美國總統大選，共和黨會勝選嗎？",
    outcomes: [
      { label: "YES 勝選", percent: "64%", yesMarket: "2028 美國總統大選，共和黨會勝選嗎？", yesPrice: 0.64, noMarket: "2028 美國總統大選，共和黨會勝選嗎？", noPrice: 0.36 },
      { label: "NO 未勝選", percent: "36%", yesMarket: "共和黨未勝選", yesPrice: 0.36, noMarket: "共和黨未勝選", noPrice: 0.64 },
    ],
    volume: "$12M 交易量",
    volumeValue: 12000000,
    cycle: "每週",
  },
  {
    id: 2,
    categories: "policy usa",
    icon: "fa-solid fa-flag-usa",
    imgClass: "red",
    title: "聯儲局今年會降息幾次？",
    outcomes: [
      { label: "0 次", percent: "28%", yesMarket: "聯儲局今年降息 0 次", yesPrice: 0.28, noMarket: "聯儲局今年降息 0 次", noPrice: 0.72 },
      { label: "1 次以上", percent: "72%", yesMarket: "聯儲局今年降息 1 次以上", yesPrice: 0.72, noMarket: "聯儲局今年降息 1 次以上", noPrice: 0.28 },
    ],
    volume: "$40M 交易量",
    volumeValue: 40000000,
    cycle: "每月",
  },
  {
    id: 3,
    categories: "election taiwan",
    icon: "fa-solid fa-building-columns",
    imgClass: "blue",
    title: "台灣 2028 總統大選，執政黨會連任嗎？",
    outcomes: [
      { label: "會連任", percent: "57%", yesMarket: "台灣 2028 總統大選，執政黨會連任嗎？", yesPrice: 0.57, noMarket: "台灣 2028 總統大選，執政黨會連任嗎？", noPrice: 0.43 },
      { label: "不會連任", percent: "43%", yesMarket: "台灣執政黨不連任", yesPrice: 0.43, noMarket: "台灣執政黨不連任", noPrice: 0.57 },
    ],
    volume: "$8M 交易量",
    volumeValue: 8000000,
    cycle: "每週",
  },
  {
    id: 4,
    categories: "international policy",
    icon: "fa-solid fa-earth-asia",
    imgClass: "green-bg",
    title: "G7 峰會是否會發布新的共同制裁聲明？",
    outcomes: [
      { label: "會發布", percent: "61%", yesMarket: "G7 峰會是否會發布新的共同制裁聲明？", yesPrice: 0.61, noMarket: "G7 峰會是否會發布新的共同制裁聲明？", noPrice: 0.39 },
      { label: "不會發布", percent: "39%", yesMarket: "G7 不發布制裁聲明", yesPrice: 0.39, noMarket: "G7 不發布制裁聲明", noPrice: 0.61 },
    ],
    volume: "$3M 交易量",
    volumeValue: 3000000,
    cycle: "每日",
  },
  {
    id: 5,
    categories: "congress policy usa",
    icon: "fa-solid fa-scale-balanced",
    imgClass: "purple",
    title: "美國最高法院今年是否會推翻重大政策？",
    outcomes: [
      { label: "會", percent: "48%", yesMarket: "美國最高法院今年是否會推翻重大政策？", yesPrice: 0.48, noMarket: "美國最高法院今年是否會推翻重大政策？", noPrice: 0.52 },
      { label: "不會", percent: "52%", yesMarket: "最高法院不推翻政策", yesPrice: 0.52, noMarket: "最高法院不推翻政策", noPrice: 0.48 },
    ],
    volume: "$6M 交易量",
    volumeValue: 6000000,
    cycle: "每月",
  },
  {
    id: 6,
    categories: "poll election",
    icon: "fa-solid fa-newspaper",
    imgClass: "orange",
    title: "下次總統辯論是否會出現民調大幅反轉？",
    outcomes: [
      { label: "會反轉", percent: "33%", yesMarket: "下次總統辯論是否會出現民調大幅反轉？", yesPrice: 0.33, noMarket: "下次總統辯論是否會出現民調大幅反轉？", noPrice: 0.67 },
      { label: "不會反轉", percent: "67%", yesMarket: "辯論民調不反轉", yesPrice: 0.67, noMarket: "辯論民調不反轉", noPrice: 0.33 },
    ],
    volume: "$980K 交易量",
    volumeValue: 980000,
    cycle: "每日",
  },
];

const categories = [
  ["all", "全部"],
  ["election", "總統大選"],
  ["poll", "民調"],
  ["policy", "政策"],
  ["international", "國際政治"],
  ["congress", "國會"],
  ["taiwan", "台灣"],
  ["usa", "美國"],
];

const sortOptions = ["預設排序", "交易量最高", "最高價格", "最新市場"];

const categoryKeywords = {
  election: ["選舉", "大選", "總統", "市長", "立委"],
  poll: ["民調", "支持率"],
  policy: ["政策", "法案", "立法", "降息"],
  international: ["國際", "外交", "G7", "峰會", "制裁"],
  congress: ["國會", "立法院", "參議院", "眾議院"],
  taiwan: ["台灣", "臺灣"],
  usa: ["美國", "川普", "特朗普", "Fed", "聯準會"],
};

function toPoliticsMarket(market) {
  const yesPool = Number(market.yesPool) || 0;
  const noPool = Number(market.noPool) || 0;
  const totalPool = yesPool + noPool;
  const yesPrice = totalPool > 0 ? noPool / totalPool : 0.5;
  const noPrice = totalPool > 0 ? yesPool / totalPool : 0.5;
  const searchableText = `${market.title || ""} ${market.description || ""}`;
  const matchedCategories = Object.entries(categoryKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => searchableText.includes(keyword)))
    .map(([category]) => category);

  return {
    id: market.id,
    categories: matchedCategories.join(" "),
    icon: "fa-solid fa-landmark",
    imgClass: "",
    title: market.title,
    outcomes: [{
      label: "市場機率",
      percent: `${Math.round(yesPrice * 100)}%`,
      yesMarket: market.title,
      yesPrice,
      noMarket: market.title,
      noPrice,
    }],
    volume: `${formatCurrency(totalPool)} 流動池`,
    volumeValue: totalPool,
    cycle: formatCloseAt(market.closeAt),
    closeAt: market.closeAt,
    createdAt: market.createdAt,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCloseAt(value) {
  if (!value) return "未設定截止時間";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定截止時間";
  return `${date.toLocaleDateString("zh-TW")} 截止`;
}

export default function MarketPolitics() {
  const [apiMarkets, setApiMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPrice, setCurrentPrice] = useState(0.5);
  const [currentSide, setCurrentSide] = useState("YES");
  const [selectedMarket, setSelectedMarket] = useState("尚未選擇市場");
  const [amount, setAmount] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeSort, setActiveSort] = useState("預設排序");
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastShow, setToastShow] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  useEffect(() => {
    let active = true;

    getMarkets({ size: 100 })
      .then((data) => {
        if (!active) return;
        const politicsMarkets = (Array.isArray(data) ? data : [])
          .filter((market) => ["政治", "politics"].includes(String(market.category).toLowerCase()))
          .filter((market) => market.status === "ACTIVE")
          .map(toPoliticsMarket);
        setApiMarkets(politicsMarkets);
        if (politicsMarkets[0]) {
          setSelectedMarket(politicsMarkets[0].title);
          setCurrentPrice(politicsMarkets[0].outcomes[0].yesPrice);
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "政治市場載入失敗");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredMarkets = useMemo(() => {
    let result = apiMarkets.filter((market) => {
      const matchCategory = activeCategory === "all" || market.categories.includes(activeCategory);
      const text = `${market.title} ${market.volume} ${market.cycle}`.toLowerCase();
      const matchSearch = activeSearch === "" || text.includes(activeSearch.toLowerCase());
      return matchCategory && matchSearch;
    });

    if (activeSort === "交易量最高") result = [...result].sort((a, b) => b.volumeValue - a.volumeValue);
    if (activeSort === "最高價格") {
      result = [...result].sort((a, b) => getHighestPrice(b) - getHighestPrice(a));
    }
    if (activeSort === "最新市場") {
      result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [apiMarkets, activeCategory, activeSearch, activeSort]);

  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleMarkets = filteredMarkets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const amountNumber = Number(amount) || 0;
  const shares = currentPrice > 0 ? amountNumber / currentPrice : 0;
  const fee = amountNumber * 0.01;
  const total = amountNumber + fee;

  function chooseBet(marketName, side, price) {
    setSelectedMarket(marketName);
    setCurrentSide(side);
    setCurrentPrice(price);
  }

  function handleCategory(category) {
    setActiveCategory(category);
    setCurrentPage(1);
  }

  function handleSearch(value) {
    setActiveSearch(value.trim());
    setCurrentPage(1);
  }

  function handleSort(option) {
    setActiveSort(option);
    setSortOpen(false);
    setCurrentPage(1);
  }

  function submitBet() {
    if (!amountNumber || amountNumber <= 0) {
      setSubmitError(true);
      setTimeout(() => setSubmitError(false), 1800);
      return;
    }

    setToastShow(true);
    setTimeout(() => setToastShow(false), 2200);
  }

  function handleGlow(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  return (
    <>
    

      <main className="market-page">
        <section className="politics-banner">
         
          <div className="politics-banner-content">
            <span>POLITICS MARKET</span>
            <h2>政治市場</h2>
            <p>預測全球政治事件，參與即時 Yes / No 交易。</p>
          </div>
        </section>

        <div className="category-tabs">
          {categories.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeCategory === value ? "active" : ""}
              onClick={() => handleCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="market-search">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              value={activeSearch}
              placeholder="搜尋盤口，例如：Trump、Fed、台灣"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="sort-dropdown">
            <button type="button" className="sort-btn" onClick={() => setSortOpen(!sortOpen)}>
              <i className="fa-solid fa-arrow-down-wide-short" />
              <span>{activeSort}</span>
              <i className="fa-solid fa-chevron-down" />
            </button>

            <div className={`sort-menu ${sortOpen ? "show" : ""}`}>
              {sortOptions.map((option) => (
                <div
                  key={option}
                  className={`sort-item ${activeSort === option ? "active" : ""}`}
                  onClick={() => handleSort(option)}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="politics-layout">
          <div className="market-left">
            <section className="market-card-grid">
              {loading && <p className="market-list-message">政治市場載入中...</p>}
              {!loading && loadError && <p className="market-list-message error">載入失敗：{loadError}</p>}
              {!loading && !loadError && visibleMarkets.length === 0 && (
                <p className="market-list-message">目前沒有符合條件的政治市場</p>
              )}
              {visibleMarkets.map((market) => (
                <article key={market.id} className="predict-card glow-card" onMouseMove={handleGlow}>
                  <div className="card-head">
                    <div className={`market-img ${market.imgClass}`}><i className={market.icon} /></div>
                    <h3>{market.title}</h3>
                  </div>

                  {market.outcomes.map((outcome) => (
                    <div className="outcome-row" key={outcome.label}>
                      <span>{outcome.label}</span>
                      <strong>{outcome.percent}</strong>
                      <button type="button" className="yes-bet" onClick={() => chooseBet(outcome.yesMarket, "YES", outcome.yesPrice)}>Yes</button>
                      <button type="button" className="no-bet" onClick={() => chooseBet(outcome.noMarket, "NO", outcome.noPrice)}>No</button>
                    </div>
                  ))}

                  <div className="card-footer">
                    <span>{market.volume}</span>
                    <span><i className="fa-solid fa-repeat" /> {market.cycle}</span>
                    <i className="fa-regular fa-bookmark" />
                  </div>
                </article>
              ))}
            </section>

            <div className="pagination">
              <button type="button" className={`page-btn prev ${safePage === 1 ? "disabled" : ""}`} onClick={() => safePage > 1 && setCurrentPage(safePage - 1)}>&lt; 上一頁</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} type="button" className={`page-number ${safePage === page ? "active" : ""}`} onClick={() => setCurrentPage(page)}>{page}</button>
              ))}
              <button type="button" className={`page-btn next ${safePage === totalPages ? "disabled" : ""}`} onClick={() => safePage < totalPages && setCurrentPage(safePage + 1)}>下一頁 &gt;</button>
            </div>
          </div>

          <aside className="trade-sidebar glow-card" onMouseMove={handleGlow}>
            <div className="trade-sidebar-header">
              <div>
                <h2>交易</h2>
                <p className="balance-text">餘額：10,000 USDC</p>
              </div>
            </div>

            <div className="selected-market-box">
              <span>市場</span>
              <strong>{selectedMarket}</strong>
            </div>

            <div className="side-switch">
              <button type="button" className={currentSide === "YES" ? "active yes" : "yes"} onClick={() => setCurrentSide("YES")}>YES</button>
              <button type="button" className={currentSide === "NO" ? "active no" : "no"} onClick={() => setCurrentSide("NO")}>NO</button>
            </div>

            <div className="bet-form">
              <label>價格</label>
              <div className="bet-input-box">
                <input value={currentPrice.toFixed(2)} readOnly />
                <span>USDC</span>
              </div>

              <label>下注金額</label>
              <div className="bet-input-box">
                <input type="number" value={amount} placeholder="輸入金額" onChange={(e) => setAmount(e.target.value)} />
                <span>USDC</span>
              </div>

              <div className="quick-bets">
                {[10, 50, 100, 500].map((value) => (
                  <button key={value} type="button" onClick={() => setAmount(String(value))}>{value}</button>
                ))}
              </div>

              <div className="bet-summary">
                <div><span>預估 Shares</span><strong>{shares.toFixed(2)}</strong></div>
                <div><span>最大收益</span><strong>${shares.toFixed(2)}</strong></div>
                <div><span>手續費</span><strong>${fee.toFixed(2)}</strong></div>
                <div><span>總金額</span><strong>${total.toFixed(2)}</strong></div>
              </div>

              <button type="button" className="submit-bet-btn" onClick={submitBet} style={submitError ? { background: "#ff476d" } : undefined}>
                {submitError ? "請輸入下注金額" : `立即下注 ${currentSide}`}
              </button>

              <p className="risk-text">
                <i className="fa-solid fa-triangle-exclamation" /> 預測市場涉及風險，下注前請確認方向與價格。
              </p>
            </div>

            <div className="position-box">
              <h3>你的持倉</h3>
              <div className="position-row"><span>YES Shares</span><strong>0</strong></div>
              <div className="position-row"><span>平均成本</span><strong>0.00</strong></div>
              <div className="position-row"><span>未實現盈虧</span><strong className="green-text">+0.00</strong></div>
            </div>
          </aside>
        </div>
      </main>

  
      <div className={`bet-toast ${toastShow ? "show" : ""}`}>
        <i className="fa-solid fa-check" /> 下注成功
      </div>
    </>
  );
}

function getHighestPrice(market) {
  return Math.max(...market.outcomes.flatMap((item) => [item.yesPrice, item.noPrice]));
}
