# UcMarket 專題規格書

## 1. 專題名稱

UcMarket：使用者生成預測市場平台

## 2. 專題摘要

UcMarket 是一個以虛擬點數運作的預測市場平台。使用者可以瀏覽各種未來事件市場，針對 Yes/No 結果進行交易，系統會根據交易行為調整價格，讓價格近似反映市場參與者對事件發生機率的看法。

平台也允許使用者提交自己的預測盤。為避免題目模糊、無法結算或違規，所有使用者提交的市場都必須經過自動規則檢查與管理員審核，通過後才會正式上架。

## 3. 專題目標

- 建立一個完整的模擬預測市場平台。
- 實作使用者建立市場、交易與結算的核心流程。
- 設計簡化但合理的價格變動機制。
- 呈現即時價格、交易紀錄與排行榜 (曬單l)。
- 展示平台治理能力，例如市場審核、結算條件與爭議處理。

## 4. 使用者角色

### 一般使用者

- 註冊與登入。
- 領取或持有虛擬點數。
- 瀏覽市場。
- 買入 Yes 或 No 份額。
- 查看持倉、交易紀錄與盈虧。
- 提交新的預測市場。

### 開盤者

開盤者也是一般使用者，但額外擁有提交市場的行為。開盤者可以因市場通過審核、交易量達標或結算完成獲得聲望值或平台獎勵。

### 管理員

- 審核使用者提交的市場。
- 編輯不清楚的市場說明。
- 拒絕不符合規則的市場。
- 在市場到期後設定正確結果。
- 處理爭議或取消市場。
- 黑名單
- 後台系統（獨立出來）

## 5. 核心流程

### 5.1 使用者交易流程

1. 使用者登入。
2. 進入市場列表。
3. 選擇一個市場。
4. 查看市場標題、結算規則、目前價格、價格走勢與交易紀錄。
5. 選擇買入 Yes 或 No。
6. 輸入金額或份額數量。
7. 系統試算預估成交價格與潛在報酬。
8. 使用者確認交易。
9. 系統更新錢包、持倉、市場價格與交易紀錄。

### 5.2 使用者開盤流程

1. 使用者點擊「建立市場」。
2. 填寫市場標題、選項、截止時間、資料來源與結算規則。
3. 系統執行自動規則檢查。
4. 若檢查通過，市場進入待審核狀態。
5. 管理員審核後選擇通過、要求修改或拒絕。
6. 通過後市場正式上架。

### 5.3 市場結算流程

1. 市場到達截止時間後停止交易。
2. 管理員依照資料來源與結算規則設定結果。
3. 系統將正確結果的份額結算為固定價值。
4. 系統更新使用者餘額、盈虧與排行榜。
5. 市場狀態變更為已結算。

## 6. 市場建立規則

一個可上架的市場必須符合以下條件：

- 結果可以被客觀驗證。
- 有明確截止時間。
- 有明確資料來源。
- 結算條件不能依賴主觀感受。
- 問題只描述一個事件。
- 不涉及違法、暴力、仇恨或個資內容。
- 不使用模糊詞，例如「很紅」、「成功」、「重大」、「受歡迎」。

### 好的市場範例

「2026-06-30 23:59 UTC 前，BTC 是否會在 Coinbase 現貨價格突破 120,000 美元？」

### 不好的市場範例

「某歌手的新專輯會不會很紅？」

原因：「很紅」沒有客觀判定標準。

## 7. 市場類型規劃

### 7.1 MVP：二元市場

MVP 階段先支援二元市場。每個市場只有兩個結果：

- Yes
- No

這種市場適合以下題型：

- 某事件是否會在截止時間前發生？
- 某數值是否會達到指定門檻？
- 某結果是否符合明確條件？

次數類題目在 MVP 階段可以先改寫成二元門檻盤，例如：

「2026-05-25 00:00 至 23:59 ET 期間，某公開人物是否至少 1 次在公開演說、記者會或官方影片中說出指定句子？」

### 7.2 進階版：次數型 / 數值型市場

完整版本會支援次數型或數值型市場，讓使用者可以針對「實際發生幾次」或「數值落在哪個區間」進行交易。

範例：

「2026-05-25 00:00 至 23:59 ET 期間，某公開人物在公開演說、記者會或官方影片中，說出指定句子的次數會落在哪個區間？」

可交易選項：

- 0 次
- 1 次
- 2-3 次
- 4 次以上

次數型市場必須額外要求：

- 明確時間範圍。
- 明確計算單位，例如完整句子、關鍵詞、官方逐字稿出現次數。
- 明確資料來源，例如官方逐字稿、官方影片、指定媒體資料庫。
- 明確區間邊界，避免 2-3 次、3-5 次這類重疊選項。
- 明確結算方式，例如管理員輸入實際次數後，系統自動對應勝出區間。

此類市場不適合直接使用 yes_pool / no_pool，而應改用 market_options 儲存每個可交易結果。

## 8. 價格機制

專題版建議使用簡化的 Yes/No 流動池模型。

每個市場有兩個池：

- yes_pool：Yes 流動性
- no_pool：No 流動性

價格計算：

```text
yes_price = no_pool / (yes_pool + no_pool)
no_price = yes_pool / (yes_pool + no_pool)
```

當使用者買入 Yes：

- 使用者支付虛擬點數。
- yes_pool 增加或 no_pool 相對變動。
- Yes 價格上升，No 價格下降。

這不是最完整的金融模型，但足以展示「價格隨需求變動」的概念。若時間足夠，進階版可以改成 LMSR 或固定乘積 AMM。

進階版若支援次數型 / 數值型市場，價格機制會改成「多選項市場」模型。每個 market_option 各自記錄流動池、價格與持倉，交易時不再傳 Yes / No，而是傳 option_id。

## 9. 資料表設計

> 以下欄位以目前實際 PostgreSQL 資料庫（14 張表）為準，與 `資料庫設計/ucmarket-ddl.sql`、`資料庫設計/ucmarket-er-diagram.md` 一致。`code` 為各主表的可讀顯示碼（唯一）。

### users

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 使用者 ID（PK） |
| code | varchar | 可讀顯示碼（唯一） |
| username | varchar | 使用者名稱（唯一） |
| email | varchar | Email（唯一） |
| password_hash | varchar | 密碼雜湊；OAuth 帳號可為 null |
| role | enum | USER / ADMIN |
| status | enum | ACTIVE / BANNED / DISABLED |
| reputation | integer | 聲望值 |
| last_login_at | timestamp | 最後登入時間 |
| avatar_url | text | 頭像 URL |
| bio | text | 個人簡介 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

### user_sessions

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | Session ID（PK） |
| user_id | uuid | 使用者 ID（FK） |
| refresh_token_hash | varchar | refresh token 雜湊（唯一） |
| expires_at | timestamp | 過期時間 |
| revoked_at | timestamp | 撤銷時間；未撤銷為 null |
| ip_address | varchar | 來源 IP |
| created_at | timestamp | 建立時間 |

### user_oauth_accounts

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 綁定 ID（PK） |
| user_id | uuid | 使用者 ID（FK） |
| provider | enum | GOOGLE / FACEBOOK / GITHUB |
| provider_uid | varchar | 第三方唯一識別；與 provider 組成唯一鍵 |
| email | varchar | 第三方 Email |
| created_at | timestamp | 綁定時間 |

### wallets

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 錢包 ID（PK） |
| user_id | uuid | 使用者 ID（FK，唯一） |
| balance | numeric | 虛擬點數餘額 |
| locked_balance | numeric | 凍結中餘額 |
| version | integer | 樂觀鎖版本號 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

### wallet_transactions

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 異動 ID（PK） |
| wallet_id | uuid | 錢包 ID（FK） |
| type | enum | SIGNUP_BONUS / TRADE_BUY / TRADE_SELL / RESOLUTION_PAYOUT / REFUND / BONUS / ADJUSTMENT |
| amount | numeric | 異動金額 |
| balance_after | numeric | 異動後餘額 |
| reference_type | enum | BONUS / TRADE / MARKET / ADJUSTMENT / ADMIN / SYSTEM；可為 null |
| reference_id | uuid | 來源單據 ID |
| idempotency_key | varchar | 冪等鍵（唯一） |
| metadata | jsonb | 附加資料 |
| created_at | timestamp | 建立時間 |

### markets

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 市場 ID（PK） |
| code | varchar | 可讀顯示碼（唯一） |
| creator_id | uuid | 開盤者 ID（FK） |
| title | varchar | 市場標題 |
| description | text | 市場說明 |
| category | varchar | 分類 |
| market_type | enum | BINARY / COUNT_RANGE / MULTIPLE_CHOICE |
| source_url | text | 結算資料來源 |
| resolution_rule | text | 結算規則 |
| close_at | timestamp | 停止交易時間 |
| status | enum | DRAFT / PENDING / ACTIVE / CLOSED / RESOLVED / REJECTED / CANCELED |
| result | enum | YES / NO / null；MVP 二元市場使用 |
| result_value | numeric | 實際結算數值；次數型市場使用 |
| yes_pool | numeric | Yes 流動池；MVP 二元市場使用 |
| no_pool | numeric | No 流動池；MVP 二元市場使用 |
| approved_at | timestamp | 審核通過時間 |
| approved_by | uuid | 審核者 ID（FK） |
| resolved_at | timestamp | 結算時間 |
| resolved_by | uuid | 結算者 ID（FK） |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

### market_options

進階版支援次數型 / 多選項市場時使用。MVP 階段可先不實作。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 市場選項 ID |
| market_id | uuid | 市場 ID |
| label | varchar | 顯示名稱，例如 0 次、1 次、2-3 次 |
| min_value | numeric | 區間下限；次數型市場使用 |
| max_value | numeric | 區間上限；次數型市場使用，可為 null 表示以上 |
| pool | numeric | 此選項流動池 |
| sort_order | integer | 顯示順序 |
| is_winning_option | boolean | 結算後是否為勝出選項 |

### market_reviews

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 審核 ID（PK） |
| code | varchar | 可讀顯示碼（唯一） |
| market_id | uuid | 市場 ID（FK） |
| reviewer_id | uuid | 管理員 ID（FK） |
| status | enum | APPROVED / REJECTED / CHANGES_REQUESTED |
| comment | text | 審核意見 |
| created_at | timestamp | 審核時間 |

### trades

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 交易 ID（PK） |
| code | varchar | 可讀顯示碼（唯一） |
| user_id | uuid | 使用者 ID（FK） |
| market_id | uuid | 市場 ID（FK） |
| option_id | uuid | 市場選項 ID（FK）；進階多選項市場使用 |
| side | enum | YES / NO；MVP 二元市場使用，可為 null |
| action | enum | BUY / SELL |
| amount | numeric | 花費點數 |
| price | numeric | 成交價格 |
| shares | numeric | 取得份額 |
| created_at | timestamp | 交易時間 |

### positions

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 持倉 ID（PK） |
| user_id | uuid | 使用者 ID（FK） |
| market_id | uuid | 市場 ID（FK） |
| option_id | uuid | 市場選項 ID（FK）；進階多選項市場使用 |
| yes_shares | numeric | Yes 份額；MVP 二元市場使用 |
| no_shares | numeric | No 份額；MVP 二元市場使用 |
| yes_cost | numeric | Yes 累計成本；MVP 二元市場使用 |
| no_cost | numeric | No 累計成本；MVP 二元市場使用 |
| shares | numeric | 選項份額；進階多選項市場使用 |
| cost | numeric | 選項累計成本；進階多選項市場使用 |
| status | enum | OPEN / SETTLED / CANCELED |
| updated_at | timestamp | 更新時間 |

### market_price_history

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 紀錄 ID（PK） |
| market_id | uuid | 市場 ID（FK） |
| option_id | uuid | 市場選項 ID（FK）；進階多選項市場使用 |
| yes_price | numeric | Yes 價格；MVP 二元市場使用 |
| no_price | numeric | No 價格；MVP 二元市場使用 |
| option_price | numeric | 選項價格；進階多選項市場使用 |
| trade_volume | numeric | 成交量 |
| recorded_at | timestamp | 紀錄時間 |

### user_portfolio_snapshots

個人資產歷史快照，用於個人績效折線圖。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 快照 ID（PK） |
| user_id | uuid | 使用者 ID（FK） |
| wallet_balance | numeric | 當時錢包餘額 |
| position_value | numeric | 當時持倉估值 |
| total_asset_value | numeric | 總資產 = 餘額 + 持倉估值 |
| realized_profit | numeric | 已實現盈虧 |
| unrealized_profit | numeric | 未實現盈虧 |
| recorded_at | timestamp | 紀錄時間 |

### notifications

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 通知 ID（PK） |
| user_id | uuid | 收件使用者 ID（FK） |
| market_id | uuid | 關聯市場 ID（FK）；可為 null |
| type | enum | TRADE_SUCCESS / MARKET_CLOSED / MARKET_RESOLVED / SYSTEM / ADMIN |
| title | varchar | 通知標題 |
| message | text | 通知內容 |
| reference_type | varchar | 來源類型 |
| reference_id | uuid | 來源 ID |
| read_at | timestamp | 已讀時間；未讀為 null |
| created_at | timestamp | 建立時間 |

### admin_logs

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| id | uuid | 稽核 ID（PK） |
| code | varchar | 可讀顯示碼（唯一） |
| admin_user_id | uuid | 操作管理員 ID（FK） |
| action | varchar | 操作動作 |
| target_type | varchar | 操作對象類型 |
| target_id | uuid | 操作對象 ID |
| metadata | jsonb | 附加資料 |
| created_at | timestamp | 建立時間 |

## 10. API 規劃

### Auth

- `POST /api/auth/register`：註冊
- `POST /api/auth/login`：登入
- `POST /api/auth/logout`：登出
- `GET /api/auth/me`：取得目前使用者

### Markets

- `GET /api/markets`：市場列表
- `GET /api/markets/{id}`：市場詳情
- `POST /api/markets`：提交市場
- `GET /api/markets/{id}/options`：取得市場選項；進階次數型 / 多選項市場使用
- `GET /api/markets/{id}/prices`：價格歷史
- `GET /api/markets/{id}/trades`：市場交易紀錄

### Trading

- `POST /api/markets/{id}/trades/quote`：交易試算
- `POST /api/markets/{id}/trades`：建立交易
- `GET /api/me/positions`：我的持倉
- `GET /api/me/trades`：我的交易紀錄

### Admin

- `GET /api/admin/markets/pending`：待審核市場
- `POST /api/admin/markets/{id}/approve`：通過市場
- `POST /api/admin/markets/{id}/reject`：拒絕市場
- `POST /api/admin/markets/{id}/resolve`：結算市場

### Ranking

- `GET /api/rankings/profit`：盈虧排行榜
- `GET /api/rankings/win-rate`：勝率排行榜
- `GET /api/rankings/assets`：資產排行榜，錢包餘額加上 OPEN 持倉依 `market_price_history` 最新價格估值

## 11. 前端頁面規劃

### 首頁 / 市場列表

- 熱門市場
- 即將截止市場
- 分類篩選
- 搜尋
- 市場卡片顯示 Yes 機率、成交量與截止時間

### 市場詳細頁

- 市場標題與狀態
- Yes/No 目前價格
- 買入面板
- 價格走勢圖
- 最近交易
- 結算規則
- 資料來源

### 建立市場頁

- 市場標題
- 分類
- 市場類型；MVP 預設為二元市場，進階版可選次數型 / 多選項
- 截止時間
- 資料來源
- 結算規則
- 市場選項；進階次數型市場需設定不可重疊的數值區間
- 自動規則檢查結果
- 送出審核

### 我的資產頁

- 虛擬點數餘額
- 持倉列表
- 已實現盈虧
- 未實現盈虧
- 交易紀錄

### 管理員後台

- 待審核市場
- 市場審核詳情
- 市場結算操作
- 使用者管理

## 12. 自動規則檢查器

建立市場時可先做簡單檢查：

- 標題長度是否足夠。
- 是否有截止時間。
- 是否有資料來源 URL。
- 結算規則是否超過最低字數。
- 是否包含主觀詞。
- 是否同時問了多個事件。
- 次數型市場的區間是否重疊。
- 次數型市場是否有明確計算單位與資料來源。

初期可以用規則式檢查。進階版可以加入 AI 輔助，讓 AI 給出「可結算性評分」與修改建議。

## 13. MVP 開發里程碑

### 第 1 週：基礎架構

- 建立前後端專案。
- 建立資料庫。
- 完成使用者註冊與登入。
- 完成基本版面與導覽。

### 第 2 週：市場功能

- 市場列表。
- 市場詳情。
- 使用者提交市場。
- 管理員審核市場。

### 第 3 週：交易功能

- 虛擬錢包。
- 交易試算。
- 買入 Yes/No。
- 持倉與交易紀錄。

### 第 4 週：結算與視覺化

- 市場停止交易。
- 管理員設定結果。
- 系統結算。
- 價格走勢圖。
- 排行榜。

### 第 5 週：打磨與報告

- UI 優化。
- 補齊錯誤處理。
- 製作測試資料。
- 撰寫專題報告與簡報。

## 14. 進階功能

- 即時價格更新。
- 市場留言或討論區。
- 開盤者聲望系統。
- 市場收藏。
- AI 市場題目優化。
- AI 市場背景摘要。
- 爭議申訴流程。
- 多選項市場。
- 次數型 / 數值區間市場。
- 更完整的 AMM 或 LMSR 定價模型。

## 15. 專題展示重點

展示時建議用一條完整故事線：

1. 使用者註冊後獲得虛擬點數。
2. 使用者提交一個新市場。
3. 管理員審核通過。
4. 其他使用者買入 Yes/No。
5. 價格隨交易改變。
6. 市場到期後管理員結算。
7. 使用者資產與排行榜更新。

這條流程可以清楚展示產品價值、資料流、交易邏輯與系統完整性。
