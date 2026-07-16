import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMarketDetail } from "../../../api/marketApi";
import { getPositions } from "../../../api/positionApi";
import useAuthStore from "../../../store/authStore";
import {
  buildDisplayPositions,
  getMarketPath,
} from "./positionAdapter";
import "./positions.css";

const FILTERS = [
  ["ALL", "全部持倉"], ["YES", "YES"], ["NO", "NO"], ["OPEN", "進行中"],
  ["PROFIT", "獲利中"], ["LOSS", "虧損中"], ["SETTLED", "已結算"],
];

const CATEGORY_COLORS = {
  "政治": "#d9aa43",
  "金融": "#4d8dff",
  "加密貨幣": "#8b5cf6",
  "天氣": "#06b6d4",
  "運動": "#ff5a5f",
  "時事": "#00d66f",
  "其他": "#9a9a9a",
};

const SIDE_COLORS = {
  YES: "#00d66f",
  NO: "#ff476d",
};

export default function PositionsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const loadPositions = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const rows = await getPositions() || [];
      const marketIds = [...new Set(rows.map((position) => position.marketId))];
      const marketEntries = await Promise.all(marketIds.map(async (marketId) => {
        try {
          return [marketId, await getMarketDetail(marketId)];
        } catch {
          return [marketId, null];
        }
      }));
      setPositions(buildDisplayPositions(rows, new Map(marketEntries)));
    } catch (error) {
      setPositions([]);
      setLoadError(error.message || "持倉資料載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const calculatedPositions = useMemo(() => positions.map((position) => {
    const pnl = position.potentialPayout - position.cost;
    return {
      ...position,
      pnl,
      pnlPercent: position.cost > 0 ? (pnl / position.cost) * 100 : 0,
    };
  }), [positions]);

  const openPositions = useMemo(
    () => calculatedPositions.filter((position) => position.status === "OPEN"),
    [calculatedPositions]
  );

  const summary = useMemo(() => {
    const totalCost = openPositions.reduce((sum, p) => sum + p.cost, 0);
    const totalPayout = openPositions.reduce((sum, p) => sum + p.potentialPayout, 0);
    return { totalCost, totalPayout, totalPnl: totalPayout - totalCost, openCount: openPositions.length };
  }, [openPositions]);

  const allocations = useMemo(() => {
    const values = {};
    openPositions.forEach((position) => {
      values[position.category] = (values[position.category] || 0) + position.cost;
    });
    const items = Object.entries(values)
      .map(([label, value]) => ({
        label,
        value,
        color: CATEGORY_COLORS[label] || CATEGORY_COLORS["其他"],
      }))
      .sort((a, b) => b.value - a.value);
    return {
      items,
      total: items.reduce((sum, item) => sum + item.value, 0),
    };
  }, [openPositions]);

  const sideAllocations = useMemo(() => {
    const values = { YES: 0, NO: 0 };
    openPositions.forEach((position) => {
      values[position.side] += position.cost;
    });
    const items = Object.entries(values)
      .filter(([, value]) => value > 0)
      .map(([label, value]) => ({
        label,
        value,
        color: SIDE_COLORS[label],
      }));
    return {
      items,
      total: items.reduce((sum, item) => sum + item.value, 0),
    };
  }, [openPositions]);

  const filteredPositions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return calculatedPositions.filter((p) => {
      const searchMatch = !keyword || `${p.title} ${p.category} ${p.side}`.toLowerCase().includes(keyword);
      const filterMatch = activeFilter === "ALL" ||
        (activeFilter === "YES" && p.side === "YES") ||
        (activeFilter === "NO" && p.side === "NO") ||
        (activeFilter === "OPEN" && p.status === "OPEN") ||
        (activeFilter === "SETTLED" && p.status === "SETTLED") ||
        (activeFilter === "PROFIT" && p.status === "OPEN" && p.pnl >= 0) ||
        (activeFilter === "LOSS" && p.status === "OPEN" && p.pnl < 0);
      return searchMatch && filterMatch;
    });
  }, [calculatedPositions, activeFilter, searchText]);

  function viewMarket(position) {
    navigate(getMarketPath(position));
  }

  return (
    <main className="positions-page">
      <section className="positions-hero glow-card" onMouseMove={handleGlow}>
        <div className="positions-hero-content">
          <span className="positions-hero-badge"><i className="fa-solid fa-layer-group" /> PORTFOLIO POSITIONS</span>
          <h1>我的持倉</h1>
          <p>歡迎回來{user ? `，${user.username || user.email}` : ""}。查看目前參與的預測市場、持倉成本、賠率與預估派彩。</p>
        </div>
        <div className="positions-hero-icon"><i className="fa-solid fa-chart-pie" /></div>
      </section>

      <section className="positions-summary-grid">
        <SummaryCard icon="fa-solid fa-wallet" label="持倉成本" value={formatMoney(summary.totalCost)} />
        <SummaryCard icon="fa-solid fa-chart-line" label="預估派彩" value={formatMoney(summary.totalPayout)} />
        <SummaryCard icon="fa-solid fa-coins" label="潛在盈虧" value={formatSignedMoney(summary.totalPnl)} valueClass={summary.totalPnl >= 0 ? "positions-profit" : "positions-loss"} />
        <SummaryCard icon="fa-solid fa-list-check" label="進行中部位" value={`${summary.openCount} 筆`} />
      </section>

      <section className="positions-analytics-grid">
        <article className="positions-chart-card glow-card" onMouseMove={handleGlow}>
          <div className="positions-section-heading">
            <div><span>PORTFOLIO ALLOCATION</span><h2>成本分類配置</h2></div>
            <button type="button" className="positions-icon-button" aria-label="重新整理" disabled={loading} onClick={loadPositions}><i className="fa-solid fa-rotate" /></button>
          </div>
          <div className="allocation-content">
            <DonutChart allocations={allocations} />
            <div className="allocation-legend">
              {allocations.items.map((item) => (
                <AllocationRow
                  key={item.label}
                  label={item.label}
                  color={item.color}
                  value={percentage(item.value, allocations.total)}
                />
              ))}
            </div>
          </div>
        </article>

        <article className="positions-chart-card glow-card" onMouseMove={handleGlow}>
          <div className="positions-section-heading">
            <div><span>POSITION SIDES</span><h2>YES／NO 成本配置</h2></div>
          </div>
          <div className="allocation-content">
            <DonutChart allocations={sideAllocations} centerLabel="持倉成本" />
            <div className="allocation-legend">
              {sideAllocations.items.map((item) => (
                <AllocationRow
                  key={item.label}
                  label={item.label}
                  color={item.color}
                  value={percentage(item.value, sideAllocations.total)}
                />
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="positions-toolbar">
        <div className="positions-filter-list">
          {FILTERS.map(([value, label]) => <button key={value} type="button" className={`positions-filter-button ${activeFilter === value ? "active" : ""}`} onClick={() => setActiveFilter(value)}>{label}</button>)}
        </div>
        <div className="positions-search-box"><i className="fa-solid fa-magnifying-glass" /><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="搜尋市場、分類或方向" /></div>
      </section>

      <section className="positions-list-header">
        <div><span>MY MARKETS</span><h2>持倉列表</h2></div>
        <div className="positions-result-count">共 <strong>{filteredPositions.length}</strong> 筆</div>
      </section>

      {loading ? (
        <section className="positions-empty"><i className="fa-solid fa-spinner fa-spin" /><h2>載入持倉中</h2><p>正在取得你的最新持倉資料。</p></section>
      ) : loadError ? (
        <section className="positions-empty"><i className="fa-solid fa-triangle-exclamation" /><h2>持倉載入失敗</h2><p>{loadError}</p><button type="button" className="position-view-button" onClick={loadPositions}>重新載入</button></section>
      ) : filteredPositions.length ? (
        <section className="positions-card-grid">
          {filteredPositions.map((position) => <PositionCard key={position.id} position={position} onView={viewMarket} />)}
        </section>
      ) : positions.length === 0 ? (
        <section className="positions-empty"><i className="fa-regular fa-folder-open" /><h2>目前還沒有持倉</h2><p>完成第一筆市場交易後，持倉會自動顯示在這裡。</p><button type="button" className="position-view-button" onClick={() => navigate("/home")}>瀏覽市場</button></section>
      ) : (
        <section className="positions-empty"><i className="fa-regular fa-folder-open" /><h2>沒有符合條件的持倉</h2><p>請切換篩選條件或重新輸入搜尋內容。</p></section>
      )}
    </main>
  );
}

function SummaryCard({ icon, label, value, valueClass = "" }) {
  return <article className="positions-summary-card glow-card" onMouseMove={handleGlow}><div className="positions-summary-icon"><i className={icon} /></div><div className="positions-summary-content"><span>{label}</span><strong className={valueClass}>{value}</strong></div></article>;
}

function AllocationRow({ label, color, value }) {
  return <div className="allocation-legend-row"><div className="allocation-name"><span className="allocation-dot" style={{ background: color }} /><span>{label}</span></div><strong>{value}</strong></div>;
}

function DonutChart({ allocations, centerLabel = "持倉成本" }) {
  let offset = 0;
  return <div className="allocation-chart-wrap"><svg className="allocation-svg" viewBox="0 0 120 120" aria-label="持倉配置圖"><circle className="donut-track" cx="60" cy="60" r="46" />{allocations.items.map((item) => { const dash = allocations.total ? (item.value / allocations.total) * 289.03 : 0; const circle = <circle key={item.label} className="donut-segment" cx="60" cy="60" r="46" stroke={item.color} strokeDasharray={`${dash} ${289.03 - dash}`} strokeDashoffset={-offset} />; offset += dash; return circle; })}</svg><div className="allocation-chart-center"><span>{centerLabel}</span><strong>{formatMoney(allocations.total)}</strong></div></div>;
}

function PositionCard({ position, onView }) {
  const open = position.status === "OPEN", profit = position.pnl >= 0;
  const impliedProbability = position.currentOdds > 0 ? 100 / position.currentOdds : 0;
  return <article className="position-card glow-card" onMouseMove={handleGlow}>
    <div className="position-card-header"><div className="position-market-icon"><i className={getCategoryIcon(position.category)} /></div><div className="position-title-area"><span>{position.category}</span><h2>{position.title}</h2></div><span className={`position-status ${open ? "position-status-open" : "position-status-settled"}`}>{getPositionStatusLabel(position.status)}</span></div>
    <div className="position-main-info"><div className={`position-side-badge ${position.side.toLowerCase()}`}>{position.side}</div><Info label="持有 Shares" value={formatNumber(position.shares)} /><Info label="平均賠率" value={formatOdds(position.avgOdds)} /><Info label="目前派彩倍率" value={formatOdds(position.currentOdds)} /></div>
    <div className="position-value-grid"><Info label="投入成本" value={formatMoney(position.cost)} valueClass="position-value-item" /><Info label="預估派彩" value={formatMoney(position.potentialPayout)} valueClass="position-value-item" /><Info label="潛在盈虧" value={formatSignedMoney(position.pnl)} className={profit ? "positions-profit" : "positions-loss"} valueClass="position-value-item" /><Info label="潛在報酬率" value={formatSignedPercent(position.pnlPercent)} className={profit ? "positions-profit" : "positions-loss"} valueClass="position-value-item" /></div>
    <div className="position-progress-section"><div className="position-progress-header"><span>隱含機率</span><strong>{Math.round(impliedProbability)}%</strong></div><div className="position-progress-track"><span style={{ width: `${Math.min(Math.max(impliedProbability, 0), 100)}%` }} /></div></div>
    <div className="position-card-footer"><span className="position-close-time"><i className="fa-regular fa-clock" /> 截止時間：{position.closeAt}</span><div className="position-action-group"><button type="button" className="position-view-button" onClick={() => onView(position)}>查看市場</button></div></div>
  </article>;
}

function Info({ label, value, className = "", valueClass = "position-info-item" }) {
  return <div className={valueClass}><span>{label}</span><strong className={className}>{value}</strong></div>;
}

function handleGlow(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
}

function getCategoryIcon(category) {
  if (category === "政治") return "fa-solid fa-landmark";
  if (category === "金融") return "fa-solid fa-chart-line";
  if (category === "加密貨幣") return "fa-brands fa-bitcoin";
  if (category === "天氣") return "fa-solid fa-cloud-sun";
  if (category === "運動") return "fa-solid fa-basketball";
  if (category === "時事") return "fa-solid fa-newspaper";
  return "fa-solid fa-chart-simple";
}

function getPositionStatusLabel(status) {
  if (status === "OPEN") return "進行中";
  if (status === "CANCELED") return "已取消";
  return "已結算";
}

function percentage(value, total) { return total > 0 ? `${Math.round((value / total) * 100)}%` : "0%"; }
function formatNumber(value) { return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
function formatMoney(value) { return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatOdds(value) { return `x${Number(value || 0).toFixed(2)}`; }
function formatSignedMoney(value) { const n = Number(value || 0); return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatSignedPercent(value) { const n = Number(value || 0); return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
