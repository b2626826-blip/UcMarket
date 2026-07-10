# UcMarket 專案全面審查報告

- **審查日期**：2026-07-08
- **審查分支**：`eagle`（最新 commit：`c581274` 時事頁更新 暫不呼叫firebase初始化 第三方登入按紐也先停用 新增ddl欄位）
- **審查範圍**：全專案原始碼與文件 —— `backend/`（Spring Boot 3.5 / Java 21）、`frontend/`（React + Vite）、`docs/資料庫設計/`（PostgreSQL DDL + migrations）、系統設計文件、整合面（OAuth/Firebase、TradingView、天氣 API、n8n、CI/CD）
- **審查方法**：四個專項審查（後端、前端、資料庫、整合）平行執行，逐檔實讀原始碼，所有發現均附檔案:行號佐證

---

## 總覽（Executive Summary）

UcMarket 是一個以虛擬點數運作的預測市場平台（資策會 Java 課程期末專題），採前後端分離架構。整體評價：

**做得好的地方**：後端錢包併發控制（悲觀鎖 + 冪等鍵 + 對抗性測試）是全專案工程紀律最高的部分；資料庫金額全用 `NUMERIC`、狀態機用 CHECK 約束下放到 DB 層；OAuth/Firebase 採 feature flag 優雅降級而非半殘。

**最需要正視的三件事**：

1. **前端「看起來完成、實際沒接」的落差很大**：交易面板（TradePanel）按下送出根本沒呼叫 API、錢包頁/交易紀錄頁全是寫死的假資料、登入頁是不會送出帳密的「演戲頁面」。展示時若不知情會非常危險。
2. **數個可直接利用的安全漏洞**：`PositionController` 有 IDOR 越權（任何登入者可查他人持倉）、admin 端點直接序列化 `User` entity 外洩 `passwordHash`、JWT secret 與 DB 密碼明文進版控、CORS 全開 + allowCredentials。
3. **文件與實作脫節**：`market_options` 表在 DDL 存在但後端完全沒有 entity；n8n 在技術架構文件佔 80 行篇幅但實作為 0%；`AdminGuard` 有 DEV 模式後門靠人工記得刪。

### 完成度快照

| 模組 | 後端 API | 前端 UI | 前後端串接 |
|---|---|---|---|
| 會員註冊/登入 | ✅ 完整（JWT + refresh token） | ✅ AuthModal 可用 | ⚠️ 整頁版 Login/Register 是假的 |
| 市場列表/詳情 | ✅ | ✅ | ⚠️ 部分頁面寫死資料；時事分類全 mock |
| 交易下單 | ✅（有市場鎖） | ✅ UI 完成 | ❌ TradePanel 未呼叫 API（0%） |
| 錢包 | ✅（併發控制最扎實） | ✅ UI 完成 | ❌ 頁面全靜態假資料（0%） |
| 持倉 | ✅（但有 IDOR） | ✅ | 部分 |
| 排行榜 | ✅ | ✅ | ✅ 已串接 |
| 管理後台 | ✅（篩選是假的、無分頁） | ✅ | ✅ 大致串接 |
| 結算 Resolution | ✅ 冪等設計佳 | — | — |
| 賣出持倉 | ⚠️ Service 寫好但無人呼叫 | — | ❌ |
| OAuth 第三方登入 | ✅ 三端就緒 | ✅ feature flag 停用中 | ⏸ 刻意分階段上線 |
| 多選項市場 | ❌ 無 entity | — | ❌（DDL 先行畫餅） |
| n8n 自動化 | ❌ 0% | — | ❌ |
| CI/CD | ❌ 0% | — | — |

---

## 一、架構

### 1.1 現況

- **技術選型**：前端 React 18 + Vite + Zustand + Bootstrap 5 + Chart.js；後端 Spring Boot 3.5（Java 21）+ Spring Security + Spring Data JPA + jjwt 0.12.5 + firebase-admin；資料庫 PostgreSQL（測試用 H2）。選型主流、穩定，符合課程與作品集定位（`backend/pom.xml`、`frontend/package.json`）。
- **分層設計**：後端 controller/service/repository/entity/dto/security/exception/config 完整齊備（17 個 controller、10 個 service、12 個 repository），前端 pages/components/api/router/store/types 分層清楚，與 `docs/系統設計/技術架構.md` 規劃大致對得上。
- **Core Domain**：文件定義 Market/Trade/Wallet/Position/Resolution/Ranking 六大領域並有五人分工（技術架構.md:13-19），核心交易邏輯確實集中在 Spring Boot Service 層而非外部工具，方向正確。

### 1.2 優點

1. **前後端分離真正落地**：前端所有資料存取集中在 `frontend/src/api/*.js` 單一層，後端以 RESTful JSON 提供服務，沒有前端直連資料庫或後端渲染頁面的混雜。
2. **關鍵領域邏輯放對位置**：錢包扣款（`WalletService`）、市場結算（`ResolutionService`）、下單（`TradeService`）都在 Service 層以 `@Transactional` + 鎖處理，符合技術架構文件「核心交易邏輯一定放 Spring Boot」的原則。
3. **文件基礎好**：`docs/` 有規格書、技術架構、網站架構、ER 圖、DDL、工作計劃書，且 `網站架構.md:355-368` 有誠實的「實作狀態摘要」表，文件文化在學生專題中屬於前段班。

### 1.3 問題與風險

1. **【高】分層原則在後端被局部打破**：`MarketController`、四個 Admin controller 直接注入 repository 跳過 service（詳見後端章節問題 3），業務規則（如 `closeAt` 必須是未來時間）因此散落或缺失。
2. **【高】「規劃文件先行、實作沒跟上」的落差集中在三處**：
   - `market_options` 多選項市場：DDL/ER 圖已完成，後端 0 實作（無 `MarketOption.java`）；
   - n8n 自動化：技術架構.md 第 8.8-10 節約 80 行規劃，`automation/n8n/workflows/` 只有 `.gitkeep`；
   - 資金鎖定機制：`Wallet.lockedBalance` 欄位存在，但 `WalletService.lock()/unlock()` 是 `UnsupportedOperationException` 占位符。
3. **【中】同一功能存在兩套平行實作**：登入/註冊有 `AuthModal`（真的）與整頁 `LoginPage`/`RegisterPage`（假的）兩套；導覽列有 `UserLayout` 內聯版（真的在用）與 `Navbar.jsx`/`Footer.jsx`/`PublicLayout.jsx`（死碼）兩套；`weatherApi.js` 存在兩份逐行相同的複本。這是多人分工（五人團隊）缺乏整合收斂的典型症狀。
4. **【中】環境管理架構缺失**：沒有 dev/staging/prod 的 profile 區分策略，前端 API base URL 寫死 `localhost:8080`、後端 CORS 全開、`AdminGuard` 靠 DEV 判斷開後門——三者都是「開發便利性直接內建進程式碼」而非透過環境設定切換。
5. **【低】`database/` 目錄只有 `.gitkeep`，實際資料庫檔案都在 `docs/資料庫設計/`**，目錄職責混淆，建議二擇一收斂。

### 1.4 建議方向

1. 建立「**單一事實來源**」紀律：每個功能只留一套實作（登入、導覽列、weatherApi 擇一刪一）；DDL 與 entity 定期對照；文件加註實作狀態。
2. 引入 **Spring Profile + 前端環境變數** 的三環境（dev/staging/prod）設定架構，把所有「開發模式特例」從程式碼移到設定。
3. 分層守則明文化：controller 不碰 repository，寫入 team convention（可放進 `Agent.md` 或 CONTRIBUTING）。

---

## 二、前端

### 2.1 優點

- **狀態管理選型合理**：Zustand 輕量、selector 用法正確（`useAuthStore((s) => s.user)`），避免了 Context API 全量刷新。
- **路由分層清楚**：`router/routes.jsx:33-80` 以巢狀路由 + `AuthGuard`/`AdminGuard` 劃分 public/member/admin 三區。
- **API 層有基本封裝**：`api/client.js` 統一 `getApi/postApi/putApi/deleteApi` 與 401 攔截。
- **排行榜 API 有防重複請求**：`rankingApi.js:11,48-60` 用 in-flight Map 去重，少見的細節優化。
- **Firebase/OAuth feature flag 乾淨**：`config/firebase.js:11` 環境變數不齊時整包 SDK 安全退化為 `null`，UI 顯示「尚未設定」而非炸頁。
- **天氣 API 有 graceful fallback**（`weatherApi.js:108-129`）、TradingView widget 有 `memo` 與 unmount 清理。
- **`AdminTable.jsx`** 是專案裡少數真正做到抽象複用的通用元件。

### 2.2 問題與風險

#### 高

| # | 問題 | 位置 |
|---|---|---|
| 1 | **Token 存 localStorage，XSS 可竊取**，且與 cookie（`credentials: 'include'`）兩套機制並存、主從不明 | `api/client.js:4-8,45-52` |
| 2 | **AdminGuard 有 DEV 後門**：`if (import.meta.env.DEV && !user) return children;` 開發模式未登入直接看到後台，靠註解提醒「正式部署時記得刪」 | `router/AdminGuard.jsx:9-11` |
| 3 | **前端守衛只是隱藏**：Guard 純看 Zustand 記憶體狀態，devtools 改 store 即繞過；安全性完全取決於後端各 API 是否自行驗證 | `AuthGuard.jsx:4-7`、`AdminGuard.jsx:4-13` |
| 4 | **TradePanel 交易按鈕是假的**：`handleTrade()` 只做本地驗證與假的成功訊息，從未呼叫 `tradeApi.createTrade()`——核心交易功能 0% 串接 | `TradePanel.jsx:38-52` |
| 5 | **整頁登入/註冊是演戲**：`LoginPage`/`RegisterPage` 的 `handleSubmit` 只彈 toast，帳密不會送出；真正能登入的只有 `AuthModal` 彈窗，兩套實作不一致 | `LoginPage.jsx:13-20`、`RegisterPage.jsx:14-21` |
| 6 | **401 攔截硬導頁**：任何 API 401/403 就 `window.location.href = '/auth/login'`（admin 也被導去會員登入頁），無 refresh token 靜默續期 | `client.js:32-37` |
| 7 | **BASE_URL 寫死 `http://localhost:8080`**：`vite build` 產物上線後必然打不到後端 | `client.js:1` |

#### 中

- **mock 偽裝成正式 API**：`marketApi.js:14-91` 的 `getCurrentEventMarkets()` 等函式完全基於 `mocks/currentEventMarkets.js` 做記憶體篩選，命名與 async 簽名與真 API 無異，呼叫方看不出是假資料。
- **錢包頁/交易紀錄頁/市場詳情頁全靜態**：`WalletPage` 餘額寫死 `$125,430.00`（`index.jsx:92`）、`TradeHistoryPage` 寫死三筆資料——而 `walletApi`/`tradeApi` 對應函式早已寫好卻沒人呼叫。
- **重複檔案**：`src/api/weatherApi.js` 與 `pages/public/market-detail-weather/weatherApi.js` 逐行相同（diff 為空），實際只有頁面內那份被 import。
- **死碼**：`Navbar.jsx`、`Footer.jsx`、`PublicLayout.jsx` 無任何檔案 import，`UserLayout` 內聯重刻了一份（含登入狀態判斷，舊版沒有）。
- **`AdminLoginPage` 用通用登入 API**（`/api/auth/login`），無專屬 admin 端點，攔截全靠 AdminGuard 前端角色判斷。
- **`useGlowEffect` 每個掛載實例各綁一個 document 級 mousemove listener**（`hooks/useGlowEffect.js:12`），多元件同時使用時重複監聽 + `closest()` 遍歷；`AuthModal.jsx:29-38` 還手刻了一份同樣邏輯沒用 hook。
- **`rankingApi.js:2-3` 註解仍寫「placeholder / mock」但程式碼已呼叫真 API**，過時註解誤導維護者。

#### 低

- `console.warn/error` 遺留（`weatherApi.js:114,127`、`rankings/index.jsx:162`）。
- `types/*.js` 只是 JSDoc typedef，無 runtime 驗證，後端改欄位名前端只會靜默 `undefined`。
- **`package.json` 中 `react`/`react-dom`/`vite` 版本寫 `"latest"`**（`package.json:16-17,22-23`），可重現建置風險。
- `RankingsPage` 的 `useState` 宣告在使用它的 `useEffect` 之後（`index.jsx:150-151` vs `186-187`），閱讀順序反直覺。
- 三個檔案重複的社群登入錯誤對照表與 email 驗證邏輯（`AuthModal.jsx:47,108-133`、`LoginPage.jsx:22-43`、`RegisterPage.jsx:23-41`）。

### 2.3 如何修改

1. **立即拔除 `AdminGuard` DEV 後門**，改用 mock 帳號或 MSW，不要讓建置模式決定權限。
2. **`client.js:1` 改為 `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'`**，並在 `.env.example` 補上該變數。
3. **TradePanel 接上 `tradeApi.createTrade()`**：含 loading/成功/失敗三態，成功後刷新 `walletStore` 與持倉——這是全專案最高優先的功能缺口。
4. **統一登入路徑**：整頁 Login/Register 改為呼叫 `useAuthStore().login/register`，或全站統一走 AuthModal，二擇一。
5. **隔離 mock**：把 mock 型函式改名（`getCurrentEventMarketsMock`）或移到 `mockMarketApi.js`；WalletPage/TradeHistoryPage 接上已存在的 `walletApi.getWalletTransactions()`/`tradeApi.getTrades()`。
6. **刪重複與死碼**：刪 `pages/.../market-detail-weather/weatherApi.js`（統一用 `src/api/` 版）；`Navbar/Footer/PublicLayout` 刪除或反向讓 `UserLayout` 複用。

### 2.4 優化方向（按優先序）

1. Token 機制重設計：評估全面改 httpOnly cookie，前端不再自存 token，消除 XSS 攻擊面。
2. 建立「頁面 × API 串接進度表」，逐頁消滅 mock/靜態資料（時事市場、錢包、交易紀錄、市場詳情）。
3. 交易流程端到端打通（TradePanel → createTrade → 刷新錢包/持倉），列為下一 sprint 第一優先。
4. 抽 `useSocialLogin()` hook 消除三處重複；合併 glow effect 為單一全域 listener。
5. 導入 zod 之類的輕量 runtime schema 驗證取代 JSDoc 假型別。
6. `package.json` 鎖定版本號、移除 `latest`。

---

## 三、後端

### 3.1 優點

1. **實作完成度高**：17 個 controller 涵蓋 Auth/Market/Trade/Wallet/Position/Ranking/Admin 全域，`SecurityConfig`、`GlobalExceptionHandler`、`JwtAuthFilter` 齊備——比檔案清單初看時完整得多。
2. **錢包併發控制是全專案最高水準**：`WalletService.credit/debit`（`WalletService.java:46-101`）= 悲觀鎖（`findByUserIdForUpdate`）+ DB 唯一 idempotency key + verify-on-hit，且有 `WalletConcurrencyTest` 做 300 執行緒對抗測試驗證守恆。
3. **金額精度正確**：`WalletService.toCents()`（:139-144）統一 `RoundingMode.DOWN` 捨到分，附設計理由註解。
4. **結算冪等**：`ResolutionService.resolveMarket`（:38-67）市場悲觀鎖 + payout key 綁 position ID，重複呼叫不重複派彩；取消退款同樣冪等（`MarketService.refundPositions`）。
5. **部分端點有 IDOR 防護意識**：`WalletController:31-36` 用 `@AuthenticationPrincipal` 並註明「杜絕 IDOR」。
6. **Dev 端點有環境隔離**：`DevWalletController` 用 `@Profile("dev")`。
7. **全域例外處理完整**：`GlobalExceptionHandler` 涵蓋主要例外型別、catch-all 不外洩 stacktrace。
8. **JWT/密碼實作正規**：HS256 + `Keys.hmacShaKeyFor`；refresh token 存 SHA-256 雜湊非明文（`AuthService.java:160,169-181`）；BCrypt 密碼雜湊。
9. **下單有市場級悲觀鎖**（`TradeService.placeTrade`:38）防同市場競態。

### 3.2 問題與風險

#### 高

| # | 問題 | 位置 |
|---|---|---|
| 1 | **CORS `allowedOriginPatterns("*")` + `allowCredentials(true)`**：任意網站可帶憑證呼叫 API；`WebConfigTest` 只驗證「不拋例外」，形同虛設 | `WebConfig.java:12-16` |
| 2 | **`passwordHash` 外洩到 JSON**：`User` entity 無 `@JsonIgnore`（全 repo 零匹配），`AdminUserController` 三個端點直接回傳 `User`/`List<User>`，admin 帳號一旦失守即整批雜湊外流 | `User.java:122-124`、`AdminUserController.java:31-47,50,59` |
| 3 | **Controller 直打 Repository 跳過 Service**：`MarketController` 與四個 Admin controller 直接注入 repository；`createMarket` 因此完全沒有 `closeAt` 未來時間檢查、`updateMarket` 缺 `@Valid` | `MarketController.java:42-120`、`AdminDashboardController.java:23-29` 等 |
| 4 | **PositionController IDOR 越權**：`GET /api/positions/user/{userId}` 等四端點無擁有者比對、無角色檢查，任何登入者可查任意使用者持倉/成本 | `PositionController.java:24-42` |

#### 中

- **JWT secret 明文進版控且無環境變數覆寫**：`app.jwt.secret=ucmarket-jwt-secret-key-...`（`application.properties:12`）沒有 `${ENV:...}` 語法；DB 密碼 `850910` 同檔第 6 行。拿到原始碼即可偽造任何人（含 admin）的 token。**應視同已外洩、需輪替**。
- **`TradeService.placeTrade:39` 丟一般 `RuntimeException("市場不存在")`**：落入 catch-all 回 500 而非 404，污染錯誤監控。
- **下單無請求級冪等鍵**：`idemKey = "TRADE_BUY_" + savedTrade.getId()` 在 save 之後才產生，前端逾時重試會產生重複 Trade + Position 疊加 + 錢包重複扣款（key 不同）——帳會不平。
- **`AdminMarketController.listMarkets:53-70` 假篩選**：`status/category/keyword` 兩個分支都是 `findAll()`，參數完全沒用。
- **死碼/占位符**：`WalletService.lock()/unlock()` 丟 `UnsupportedOperationException`；`PositionService.sellPosition` 寫好但無 controller 呼叫——賣出與資金鎖定兩大核心功能未打通，`Wallet.lockedBalance` 欄位無人寫入。

#### 低

- Admin 系列端點全部 `findAll()` 無分頁（`AdminLogController.java:36-40` 等），交易表膨脹後是效能/記憶體風險。
- `MarketController.updateMarket:98-100` 缺 `@Valid`。
- 驗證錯誤用 StringBuilder 拼成單一字串（`GlobalExceptionHandler.java:60-67`），前端無法逐欄位顯示。
- 四個 Admin controller 各複製一份「userId→code 反查快取」邏輯（`fillCodes/fillCreatorCodes`），可抽共用。

### 3.3 如何修改

1. **CORS 白名單化**：origin 清單改由 `app.cors.allowed-origins` 設定注入；做不到就先拿掉 `allowCredentials(true)`。
2. **`passwordHash` 加 `@JsonIgnore`** + `AdminUserController` 改回傳 `AdminUserResponse` DTO——一次解決洩漏與 entity 直出兩個問題。
3. **PositionController 補擁有者檢查**：個人查詢改 `/api/positions/me` 由 JWT 決定身分；market 端點若需公開則用去識別化 DTO。
4. **JWT secret/DB 密碼改 `${JWT_SECRET}`（不留預設值）**，未設定就啟動失敗；已進 git history 的值一律輪替。
5. **`TradeService` 例外改 `EntityNotFoundException`** 讓現有 handler 正確回 404。
6. **導入客戶端 `Idempotency-Key` header**：`placeTrade` 開頭先查同 key 是否已有 Trade，有則直接回傳既有結果。
7. **修掉 `AdminMarketController` 假篩選**：實作 JPA Specification 或先移除參數。
8. **Market/Admin controller 邏輯收斂進 Service**，補上 `closeAt`/`marketType` 業務校驗。

### 3.4 優化方向（按優先序）

1. 安全三連修：CORS 白名單 + secret 環境變數化 + passwordHash 遮蔽（可被外部直接利用，最優先）。
2. IDOR 補洞：PositionController 是目前任何登入者都能利用的資料外洩點。
3. 分層收斂：controller 直打 repository 的債在功能繼續擴張前處理，成本最低。
4. 交易冪等 + 資金鎖定：`lock/unlock` 與請求級冪等是交易平台正確性核心，開放真實流量前必須完成。
5. 全面 DTO 化：盤點 `Market/Trade/AdminLog/User` 直接序列化的端點，解除 API 與 DB schema 的緊耦合。
6. Admin 端點補 `Pageable` 分頁（趁資料量小時遷移成本低）。

---

## 四、資料庫

### 4.1 優點

1. **UUID 主鍵 + 人類可讀 code 並存**（`USR-0001`/`MKT-0001`，`ucmarket-ddl.sql:14-35,84-147`），兼顧分散式友善與客服可讀性。
2. **金額全面 `NUMERIC(18,2)`、價格 `NUMERIC(18,4)`**，JPA 端一致用 `BigDecimal`——預測市場最容易犯的浮點錯誤這裡完全避開。
3. **樂觀鎖 + 悲觀鎖雙保險**：`wallets.version`（`@Version`）+ `FOR UPDATE` 系列查詢（`WalletRepository.java:19-21`、`MarketRepository.java:20-22`）。
4. **Position upsert 用 `ON CONFLICT` 下放到 DB**（`PositionRepository.java:31-61`），避免 read-then-write 競態。
5. **業務狀態機做成 CHECK 約束**：`ck_markets_resolution_lifecycle`（RESOLVED 時三欄位同時非空）、`ck_trades_binary_or_option`、拒審必須留言等（`ucmarket-ddl.sql:132-145,209-212`）——應用層有 bug 也寫不出不一致資料。
6. **`wallet_transactions` 冪等鍵 + partial unique index**（:346-348），append-only ledger 設計 + `metadata JSONB` 擴充彈性。
7. **OAuth 設計正確**：`password_hash` 允許 NULL、`(provider, provider_uid)` 複合唯一鍵、`ON DELETE CASCADE`（:55-66）。
8. **外鍵幾乎都有索引**、partial index 精準表達二元/多選市場的唯一性語意（:338-389）。

### 4.2 問題與風險

#### 高

| # | 問題 | 位置 |
|---|---|---|
| 1 | **`market_options` 表有 DDL、無 entity**：`trades/positions/market_price_history` 都有 `option_id` 外鍵指向它，但後端不存在 `MarketOption.java`——ER 圖畫的餅程式碼完全沒實作 | `ucmarket-ddl.sql:168-186` vs `backend/.../entity/` |
| 2 | **`Trade` entity 與 DDL 不一致**：DDL 允許 `side` NULL、有 `option_id`；entity 卻 `side nullable=false` 且完全沒有 `optionId` 欄位 | `Trade.java:36-38` vs `ucmarket-ddl.sql:193-212` |
| 3 | **`fix-admin-password.sql` + `mock.sql` 全部 10 個帳號（含 2 個 admin）共用同一組 BCrypt hash（明文 `password`）**，若誤跑進正式環境即全帳號同密碼 | `migrations/fix-admin-password.sql`、`seed/mock.sql:26-35` |
| 4 | **`Position` entity 的 `@UniqueConstraint` 是誤導性死碼**：宣告 `(user_id, market_id)` 唯一，實際 DB 用兩條 partial unique index（依 `option_id IS NULL` 區分）——兩套規則不同 | `Position.java:19-25` vs `ucmarket-ddl.sql:338-344` |

#### 中

- **Migration 歷史顯示設計反覆（design churn）**：`sync-current-db-to-ddl.sql` 大量回頭補精度（`trades.amount/price`、`markets.yes_pool/no_pool` 型別重設）、唯一約束中途改設計；`wallet_transactions` 的 `user_id/market_id` 先加後刪（`drop-wallet-transaction-user-market-columns.sql`）。Schema 尚未收斂，新環境要按順序重放 5 個 migration 才能重建。
- **`wallet_transactions` 的 `reference_id` 是多型外鍵**，無法建真外鍵約束，只有 CHECK 限制 `reference_type` 列舉（:280-283），完整性弱於一般外鍵；查使用者錢包歷史必須多 JOIN 一層 `wallets`。
- **全部時間欄位用 `TIMESTAMP` 不帶時區**（`created_at/close_at/recorded_at`，:26-27,94,250）+ JPA `LocalDateTime`。`close_at` 直接決定市場能否交易，時區判斷錯誤即市場提前/延後關閉。
- **`positions` 表 6 個數值欄位（二元 4 欄 + 進階 2 欄）缺互斥 CHECK**：`trades` 有 `ck_trades_binary_or_option`，`positions` 沒有對應約束，允許同一列同時填二元與進階模式的值。
- `postgresql-test-troubleshooting.md` 顯示曾因帳密寫死在 properties 造成全隊本機測試失敗——環境一致性踩坑史，需寫入 onboarding。

#### 低

- `users.password_hash VARCHAR(128)` 對未來換 Argon2id 偏緊（BCrypt 60 字元目前無虞）。
- `market_price_history`/`user_portfolio_snapshots` 無 retention/分區規劃，會無上限成長。

### 4.3 如何修改

```java
// Trade.java — 若要支援進階市場，補 optionId；不做就在 DDL 加註「預留欄位，後端未實作」
@Column(name = "option_id")
private UUID optionId;
```

```java
// Position.java — 刪除誤導性 @UniqueConstraint，改註解說明真實約束在 DDL 的兩條 partial unique index
@Table(name = "positions")
```

```sql
-- positions 補互斥約束（比照 trades）
ALTER TABLE positions ADD CONSTRAINT ck_positions_binary_or_option CHECK (
    (option_id IS NULL AND shares IS NULL AND cost IS NULL)
    OR (option_id IS NOT NULL AND yes_shares = 0 AND no_shares = 0 AND yes_cost = 0 AND no_cost = 0)
);

-- wallet_transactions reference 成對檢查
ALTER TABLE wallet_transactions ADD CONSTRAINT ck_wallet_transactions_reference_pair CHECK (
    (reference_type IS NULL AND reference_id IS NULL)
    OR (reference_type IS NOT NULL AND reference_id IS NOT NULL)
);
```

```sql
-- fix-admin-password.sql 檔頭加警語
-- ⚠️ 僅限本機/測試環境。此 hash 對應明文 "password"，正式部署腳本必須排除本檔。
```

### 4.4 優化方向（按優先序）

1. **Entity ↔ DDL 一致性大盤點**（問題 1/2/4）：花半天寫腳本比對 `information_schema.columns` 與 JPA metadata，逐項決定「補實作」或「刪欄位」——這是最高風險的認知債。
2. **引入 Flyway/Liquibase**，把現有 5 個手寫 migration squash 成 `V1__baseline.sql`，保證任何環境重放結果一致——金流系統的底線要求。
3. 補 positions 互斥 CHECK、清 Position 誤導註解（各 1-2 小時的小工作，順手做）。
4. **排行榜 view 效能基準線**：`v_ranking_*` 用了 `DISTINCT ON` + 多層 CTE + LEFT JOIN，開 `pg_stat_statements` 跑 `EXPLAIN ANALYZE`，量大後考慮 materialized view。
5. `market_price_history` 提前規劃按 `recorded_at` range partition 或歸檔排程。
6. **時區決策一次拍板**：不一定要遷 `TIMESTAMPTZ`，但必須在文件明文記錄「全系統時間戳假設為 Asia/Taipei（或 UTC）」，拖越久遷移成本越高。

---

## 五、整合

### 5.1 現況與優點

- **前後端分離落地、API 層集中**，CORS 集中管理於 `WebConfig.java`。
- **OAuth/Firebase 是「分階段上線」而非半殘**：前端 feature flag（`firebase.js:11`）+ 後端 `@ConditionalOnProperty`（`FirebaseConfig.java:18`）+ DB migration（`add-oauth-support.sql`）三端一致地「寫完但環境變數未填時優雅降級」；`FirebaseAuthService.java:42-83` 甚至已含首登自動建帳號/建錢包/發獎勵。最新 commit 的「先停用」是刻意的階段性關閉。
- **天氣 API 有降級策略**（無 key 或失敗即退 mock），TradingView 用官方 embed + 正確的 unmount 清理。
- **敏感資訊管理有基本意識**：`.gitignore` 排除 `.env`，`git ls-files` 確認實際金鑰未進版控（僅 `.env.example`）。
- **文件誠實揭露完成度**（`網站架構.md:355-368` 實作狀態摘要表）。

### 5.2 問題與風險

| 嚴重度 | 問題 | 位置 |
|---|---|---|
| 高 | **前端 API base URL 寫死 + 三種 base URL 管理方式並存**（寫死常數/共用 client/直接 fetch 外部），無 `VITE_API_BASE_URL`，只能跑本機 | `client.js:1`、`.env.example` |
| 高 | **DB 密碼 `850910` 與 JWT secret 明文進版控**，且 JWT secret 完全無環境變數覆寫語法；git history 已含這些值，**應視同外洩** | `application.properties:6,12` |
| 中 | **CORS `allowedOriginPatterns("*")` + `allowCredentials(true)`**，無 profile 區分環境 | `WebConfig.java:13-16` |
| 中 | **完全沒有 CI/CD**：`.github/` 下只有 Copilot Modernization 擴充套件的本機 log 殘留物（與 CI 無關），無任何 `workflows/*.yml`；測試只靠人工 `./mvnw test` | `.github/modernize/` |
| 中 | **n8n 全空殼**：技術架構文件 80 行 workflow 規劃 vs `automation/n8n/workflows/` 只有 `.gitkeep`，後端也沒有 `/api/webhooks/n8n/*` controller——文件與實作落差最大的一塊 | `技術架構.md:258-335` |
| 低 | TradingView widget 無 `onerror`/fallback，載入失敗即靜默留白；且外部行情（BINANCE:BTCUSD）與平台自有市場價格易混淆 | `TradingViewWidget.jsx` |
| 低 | CWA 天氣 API key 走 `VITE_` 前綴必然打包進 bundle（該 key 本設計給前端用，風險可控），但無 client 端節流/cache | `weatherApi.js:110` |
| 低 | `.env.example` 只列 4 個 Firebase 變數，缺 `VITE_CWA_API_KEY` 與 API base URL，新人無法從範本理解全部所需設定 | `frontend/.env.example` |
| — | **無 Dockerfile、無部署腳本、無環境區分**——README 的 Docker 規劃屬第三階段未開始 | 專案根目錄 |

### 5.3 如何修改

1. `client.js` 改讀 `VITE_API_BASE_URL`，`.env.example` 補齊所有變數範本（API base URL、CWA key）。
2. `application.properties` 敏感值改 `${SPRING_DATASOURCE_PASSWORD}`/`${APP_JWT_SECRET}`（**不留預設值**，未設定即啟動失敗）；已提交過的密碼/金鑰輪替。
3. CORS 允許清單改 `@Value("${app.cors.allowed-origins}")` 注入，依 profile 切換。
4. **補最小 CI**：`.github/workflows/ci.yml` 跑 `cd backend && ./mvnw test` + `cd frontend && npm run build`，五人協作的 PR 基本把關。
5. n8n 二擇一：時間不足就在技術架構.md 加「本學期暫緩實作」註記（比照網站架構.md 的狀態表做法）；要做就先完成「交易成功通知」單一最小 workflow 當 Demo。
6. TradingView 補 `script.onerror` fallback 文案 + 「外部參考行情，非平台市場價格」標註。

### 5.4 優化方向（按優先序）

1. **部署基本門檻**：API base URL + 後端敏感設定環境變數化，是任何 Docker/staging 部署的先決條件。
2. **最小 CI pipeline**：先自動化測試與 build，不求 CD。
3. **CORS 收斂**：正式展示/上機前完成。
4. **文件對齊 n8n 現況**：一行註記的成本，避免口試時被抓到報告與程式碼落差。
5. TradingView 資料來源標示，提升作品集專業度。
6. `.env.example` 補齊。

---

## 六、後續優化（整合路線圖）

綜合四個面向，按「先止血、再還債、後加值」排出三級優先序：

### P0 —— 立即處理（安全與正確性，1-2 天可完成）

| # | 事項 | 面向 | 工作量 |
|---|---|---|---|
| 1 | JWT secret / DB 密碼改純環境變數、輪替已進 git history 的值 | 後端/整合 | 0.5 天 |
| 2 | `User.passwordHash` 加 `@JsonIgnore` + AdminUser 端點 DTO 化 | 後端 | 0.5 天 |
| 3 | `PositionController` 補擁有者檢查（IDOR） | 後端 | 0.5 天 |
| 4 | 拔除 `AdminGuard` DEV 後門 | 前端 | 0.5 小時 |
| 5 | CORS 白名單化（至少拿掉 `*` + credentials 組合） | 後端 | 0.5 天 |

### P1 —— 短期（讓核心功能真正能動，1-2 週）

| # | 事項 | 面向 |
|---|---|---|
| 6 | TradePanel 接上 `createTrade` API，交易流程端到端打通 | 前端 |
| 7 | WalletPage / TradeHistoryPage 接上既有 API，消滅靜態假資料 | 前端 |
| 8 | 統一登入實作（整頁版接真 API 或全站走 AuthModal） | 前端 |
| 9 | 前端 `VITE_API_BASE_URL` 環境變數化 + `.env.example` 補齊 | 前端/整合 |
| 10 | 下單導入請求級 `Idempotency-Key`，防重試重複下單 | 後端 |
| 11 | `TradeService` 例外型別修正（404 而非 500）+ AdminMarket 假篩選修正 | 後端 |
| 12 | Entity ↔ DDL 一致性盤點（`market_options`/`Trade.optionId`/`Position` 約束） | 資料庫 |
| 13 | 最小 CI pipeline（mvn test + npm build） | 整合 |

### P2 —— 中期（架構還債與作品集加值，1 個月+）

| # | 事項 | 面向 |
|---|---|---|
| 14 | Controller 直打 repository 收斂進 Service 層 | 後端 |
| 15 | 引入 Flyway，migration squash 成 baseline | 資料庫 |
| 16 | 資金鎖定（lock/unlock）+ 賣出持倉功能打通 | 後端 |
| 17 | Token 機制改 httpOnly cookie，消除 localStorage XSS 面 | 前端/後端 |
| 18 | 清死碼與重複（Navbar/PublicLayout、weatherApi 雙份、社群登入三份重複邏輯） | 前端 |
| 19 | Admin 端點分頁化 + 排行榜 view 效能基準線 | 後端/資料庫 |
| 20 | n8n 最小 workflow（交易成功通知）或文件註記暫緩 | 整合 |
| 21 | Docker 化 + 環境區分（dev/prod profile） | 整合 |
| 22 | 時區決策文件化；歷史表 retention 規劃 | 資料庫 |

### 給團隊的三個總結建議

1. **「UI 完成」≠「功能完成」**：目前最大的認知風險是前端外觀完成度遠高於資料串接完成度（交易、錢包、登入頁都是假的）。建議建立一張「頁面 × API 串接狀態表」貼在 README，Demo 前逐項打勾，避免展示時踩到假按鈕。
2. **安全問題集中在「邊界」**：核心邏輯（錢包、結算）反而是最安全的部分；漏洞都在邊界層——CORS、序列化、路徑參數授權、secret 管理。P0 五項全部是邊界修補，總工作量不到三天，投資報酬率極高。
3. **收斂比擴張重要**：五人分工留下了兩套登入、兩套導覽列、兩份 weatherApi、DDL 超前 entity 的多選項市場。在加新功能前先做一輪「單一事實來源」收斂，之後的開發速度反而會更快。

---

*本報告由四個專項審查（後端 Backend Architect、前端 Frontend Developer、資料庫 Database Optimizer、整合 general-purpose）平行實讀原始碼產出，所有發現均附檔案:行號可供覆核。*
