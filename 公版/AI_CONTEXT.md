# UcMarket 公版前端頁面 AI 交接文件

這份文件是給其他 AI、組員或後續開發者閱讀的頁面說明。目標是讓讀者不用憑空想像 UcMarket 的前端樣貌，而是能根據目前的公版頁面快速理解產品定位、畫面結構、互動邏輯與後續可串接的資料。

## 頁面定位

UcMarket 是一個以虛擬點數運作的模擬預測市場平台。使用者可以瀏覽未來事件市場，針對 Yes / No 結果進行預測交易，也可以提交新的預測市場，經過審核後上架。

目前 `公版` 資料夾是一份獨立靜態前端 prototype，主要用途是給團隊建立共同視覺參照。它不是正式 React 前端，也沒有串接後端 API。

## 檔案結構

```text
公版
├── index.html            # 首頁、市場列表、頁面公版導覽
├── auth.html             # 登入 / 註冊獨立頁
├── create-market.html    # 建立市場與規則檢查
├── market-detail.html    # 市場詳情與交易試算
├── portfolio.html        # 我的資產、持倉、交易紀錄
├── admin.html            # 管理員審核與結算操作
├── rankings.html         # 排行榜
├── styles.css            # Apple-like 視覺風格與 RWD
├── script.js             # 假資料、互動邏輯、Canvas 圖表
└── AI_CONTEXT.md         # 本文件
```

## 獨立頁面清單

- `index.html`：首頁、公版導覽、市場列表與首頁交易試算。
- `auth.html`：登入 / 註冊頁，含 tab 切換與 demo 送出狀態。
- `create-market.html`：建立市場表單，含自動規則檢查與送審狀態。
- `market-detail.html`：市場詳情頁，含走勢圖、結算規則與交易試算。
- `portfolio.html`：我的資產頁，含餘額、持倉與交易紀錄。
- `admin.html`：管理員審核頁，含通過、要求修改、拒絕與結算操作。
- `rankings.html`：排行榜頁，含盈虧、勝率、資產切換。

## 設計風格

整體設計方向接近黑底金融交易介面與 Apple 產品頁的語氣：簡潔、有力、大留白、低干擾、乾淨的深色玻璃感面板。

視覺特徵：

- 背景以黑色與深藍黑為主，例如 `#05070b`、`#090d14`。
- 主要文字使用接近白色 `#f7f8fb`。
- 卡片使用深色半透明面板，例如 `rgba(18, 22, 31, 0.9)`。
- 主要品牌色使用亮藍色 `#3b82f6`。
- 成功 / Yes / 正向數據使用亮綠色 `#34d399`。
- No / 負向狀態可使用玫瑰紅 `#fb7185`。
- 卡片圓角維持 `8px`，避免過度圓潤。
- 頁面以資訊密度清楚為主，不使用花俏裝飾圖形。
- 標題大而直接，內容區塊則採緊湊、易掃描的資料面板。

## 頁面區塊

### 1. Topbar

對應 HTML class：`.topbar`, `.polymarket-topbar`

用途：

- 顯示品牌 `UcMarket`。
- 提供大型搜尋框，讓使用者搜尋市場。
- 右側保留「玩法介紹」、「登入」、「註冊」、「新增市場」與選單按鈕。
- 「新增市場」是此版上半部必須保留的入口。
- 右上角選單由 `setupSiteMenu()` 動態產生，包含我的資產、建立市場、排行榜、管理員審核、玩法介紹、專案文件、登入 / 註冊。

目前按鈕尚未綁定實際功能，僅作為 UI 參考。

### 2. Category Bar

對應 HTML class：`.category-bar`

用途：

- 模仿 Polymarket 類型的橫向分類導覽。
- 目前只保留政治、運動、天氣、時事、金融五個入口。
- 在手機或較窄螢幕會橫向捲動。

### 3. Market Feature

對應 HTML class：`.market-feature`

用途：

- 取代原本 hero 區塊，改成更接近 Polymarket 首頁上半部的資訊版型。
- 左側是大型焦點市場卡片，右側是突發新聞與熱門話題。
- 目前焦點市場主題為「2026 年 NBA 冠軍會是哪一隊？」

包含：

- 焦點市場標題
- 市場工具按鈕
- NBA 冠軍市場機率走勢圖
- 多條隊伍機率 legend
- 市場截止時間與成交量
- 兩個 outcome price：64% / 36%
- 市場留言流
- 右側突發新聞
- 右側熱門話題
- 探索全部按鈕

### 4. Market Workspace

對應 HTML class：`.market-workspace`

用途：

- 市場列表主區塊。
- 讓使用者搜尋、篩選並選取市場。

包含：

- 區塊標題：市場列表
- 搜尋欄：`#marketSearch`
- 分類 tabs：全部、加密貨幣、科技、體育
- 市場卡片列表：由 `script.js` 中的 `markets` 陣列動態產生

市場卡片顯示：

- 分類
- 狀態
- 截止日期
- 市場問題
- 成交量
- No 機率
- Yes 機率
- 機率進度條

### 5. Trade Panel

對應 HTML class：`.trade-panel`

用途：

- 顯示目前選取市場的交易試算。
- 是未來市場詳細頁或交易 drawer 的主要參考。

包含：

- 選取市場分類
- 選取市場標題
- Yes / No segmented control
- 投入點數輸入欄
- 成交價格
- 預估份額
- 最高回收
- 送出交易按鈕
- 結算規則

目前 `送出交易` 沒有實際送出功能。正式串接時應對應：

- `POST /api/markets/{id}/trades/quote`
- `POST /api/markets/{id}/trades`

### 6. Portfolio Panel

對應 HTML class：`.portfolio-panel`

用途：

- 顯示使用者錢包與持倉摘要。

目前是假資料：

- 餘額：12,480 pts
- Yes / BTC 120K 持倉
- No / 新機發表 持倉

正式開發時可對應：

- `GET /api/auth/me`
- `GET /api/me/positions`
- `GET /api/me/trades`

### 7. Admin Review Panel

對應 HTML class：`.review-panel`

用途：

- 顯示待審核市場清單。
- 讓團隊理解管理員後台要處理的市場治理流程。

目前顯示三筆待審核提醒：

- 需確認資料來源與截止時間
- 結算條件需避免主觀描述
- 需補官方逐字稿來源

正式開發時可對應：

- `GET /api/admin/markets/pending`
- `POST /api/admin/markets/{id}/approve`
- `POST /api/admin/markets/{id}/reject`

### 8. Ranking Panel

對應 HTML class：`.ranking-panel`

用途：

- 顯示本週盈虧或聲望排行。

目前是假資料：

- chen_qa：+3,420
- market_tim：+2,850
- eagle_admin：+2,110

正式開發時可對應：

- `GET /api/rankings/profit`
- `GET /api/rankings/win-rate`
- `GET /api/rankings/assets`

## JavaScript 狀態與互動

主要資料在 `script.js` 的 `markets` 陣列。

每個 market 物件格式：

```js
{
  id: "btc-120k",
  title: "2026-06-30 前，BTC 是否會在 Coinbase 突破 120,000 美元？",
  category: "crypto",
  categoryLabel: "加密貨幣",
  status: "ACTIVE",
  yes: 64,
  no: 36,
  volume: "42.8K",
  closeAt: "2026-06-30",
  rule: "以 Coinbase 現貨價格為準，若在截止時間前突破門檻，Yes 結算為勝出。"
}
```

目前頁面狀態：

```js
let activeFilter = "all";
let activeMarket = markets[0];
let activeSide = "yes";
let activeAuthMode = "login";
```

主要函式：

- `drawHeroChart()`：用 Canvas 畫上半部焦點市場的多條機率走勢。
- `renderMarkets()`：依照分類與搜尋字串重新渲染市場列表。
- `updateSelectedMarket()`：使用者點選市場卡片後，更新右側交易面板。
- `updateQuote()`：根據投入點數與 Yes / No 價格計算預估份額與最高回收。
- `openAuthModal()` / `closeAuthModal()`：控制登入註冊彈窗開關。
- `setAuthMode()`：切換登入與註冊表單。

互動行為：

- 點擊右上角「登入」會開啟登入彈窗。
- 點擊右上角「註冊」會開啟註冊彈窗。
- 彈窗可用 tab 切換登入 / 註冊，可用背景、關閉按鈕或 Esc 關閉。
- 表單目前只顯示 demo 狀態文字，正式版可串接 Auth API。
- 點擊分類 tab 會更新 `activeFilter` 並重新渲染市場卡片。
- 在搜尋欄輸入文字會即時篩選市場。
- 點擊市場卡片會更新交易面板的市場標題、分類與結算規則。
- 點擊 Yes / No 會切換交易方向並重新計算價格。
- 修改投入點數會重新計算預估份額與最高回收。

## 報價試算邏輯

目前 prototype 的試算邏輯是簡化版：

```js
const price = activeSide === "yes" ? activeMarket.yes / 100 : activeMarket.no / 100;
const shares = amount / price;
const possibleReturn = shares;
```

說明：

- `yes` 與 `no` 目前以百分比表示。
- 若 Yes 為 64%，成交價格顯示為 `0.64`。
- 投入 500 點時，預估份額為 `500 / 0.64 = 781.25`。
- 最高回收暫時等於份額數量。

正式版應由後端 quote API 回傳試算結果，不應只用前端自行計算。

## RWD 行為

CSS 有兩個主要斷點：

```css
@media (max-width: 1080px)
@media (max-width: 760px)
```

在窄螢幕中：

- Market Feature、交易面板、列表、下方資訊區會改為單欄。
- 玩法介紹與註冊按鈕會隱藏，保留「登入」、「新增市場」與選單。
- 分類列會橫向捲動。
- 大型焦點市場卡片內部會改成上下排列。
- 市場卡片會由雙欄改成單欄。

目前已檢查手機寬度沒有水平溢出。

## 與後端 API 的對應方向

根據專案文件，目前可對應以下 API：

```text
GET  /api/markets
GET  /api/markets/{id}
POST /api/markets
POST /api/markets/{id}/trades/quote
POST /api/markets/{id}/trades
GET  /api/me/positions
GET  /api/me/trades
GET  /api/admin/markets/pending
POST /api/admin/markets/{id}/approve
POST /api/admin/markets/{id}/reject
POST /api/admin/markets/{id}/resolve
GET  /api/rankings/profit
GET  /api/rankings/win-rate
GET  /api/rankings/assets
```

未來如果轉成 React，建議拆成：

```text
components/
├── Topbar.jsx
├── CategoryBar.jsx
├── MarketFeature.jsx
├── FeaturedMarketPanel.jsx
├── DiscoveryRail.jsx
├── MarketList.jsx
├── MarketCard.jsx
├── TradePanel.jsx
├── AuthModal.jsx
├── AuthPage.jsx
├── CreateMarketPage.jsx
├── MarketDetailPage.jsx
├── PortfolioPanel.jsx
├── AdminReviewPage.jsx
└── RankingPage.jsx
```

## 給後續 AI 的修改原則

如果你是另一個 AI，要基於這份公版繼續修改，請遵守以下方向：

1. 不要修改原本專案的 `frontend` 資料夾，除非使用者明確要求。
2. 保持黑底 Apple-like 風格：乾淨、留白、少色彩、低噪音。
3. 不要把頁面改成行銷 landing page；這是產品操作介面的參考公版。
4. 卡片圓角維持小圓角，避免過度可愛或遊戲化。
5. 若增加功能，優先補足預測市場產品需要的頁面狀態，例如 loading、empty、error、pending review、resolved。
6. 若串接後端，讓 quote 與 trade 以 API 結果為準，不要只依賴前端假資料。
7. 若轉成 React，先保留目前視覺與資訊架構，再逐步拆 component。

## 可優先擴充的功能

- 市場詳細頁 modal 或獨立頁。
- 建立市場表單。
- 登入 / 註冊 API 串接。
- 使用者持倉完整列表。
- 交易紀錄表。
- 管理員審核詳情與 approve / reject 操作。
- 市場結算操作。
- 真實 API 串接。
- Loading / Empty / Error 狀態。
- 價格歷史圖改用正式圖表套件。

## 一句話總結

這份公版是 UcMarket 的前端視覺與產品流程參照物：它用 Polymarket 類型的上半部資訊架構，加上簡潔、有力的黑底 Apple-like 視覺語言，把「搜尋、分類、焦點市場、價格機率、交易試算、資產、審核、排行」放在同一個可操作頁面中，讓團隊能以此為共同基準繼續開發。
