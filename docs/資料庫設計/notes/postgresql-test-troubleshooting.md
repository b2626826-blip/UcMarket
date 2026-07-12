# PostgreSQL 測試錯誤整理

> 本檔只處理 PostgreSQL 連線／測試排錯。現行 schema 請見 `../ucmarket-ddl.sql` 與 `../../current-implementation.md`；後端一般測試使用 H2 PostgreSQL mode，不會驗證本機 PostgreSQL 帳密。

## 問題現象

在 `backend` 目錄執行完整測試：

```bash
./mvnw test
```

測試結果出現 4 個 errors：

```text
Tests run: 53
Failures: 0
Errors: 4
Skipped: 0
```

主要錯誤訊息包含：

```text
FATAL: role "postgres" does not exist
Unable to determine Dialect without JDBC metadata
Failed to load ApplicationContext
```

## 真正原因

這次不是排行榜功能邏輯錯，也不是 `ApplicationContext` 本身壞掉。

真正源頭是 Spring Boot 測試啟動時會讀取 `application.properties` 的 datasource 設定：

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ucmarket
spring.datasource.username=postgres
spring.datasource.password=post
```

但本機 PostgreSQL 裡沒有 `postgres` 這個 role，只有自己的本機帳號，例如：

```text
eagleaby
```

所以 Spring Boot 嘗試用 `postgres/post` 連線時會失敗：

```text
FATAL: role "postgres" does not exist
```

Hibernate 因為連不上資料庫，拿不到 JDBC metadata，才會接著出現：

```text
Unable to determine Dialect without JDBC metadata
```

最後 Spring 測試 context 載入失敗，因此看到：

```text
Failed to load ApplicationContext
```

## 檢查方式

確認本機 PostgreSQL 有哪些 role：

```bash
psql -d postgres -c "\du"
```

確認 `ucmarket` database 是否存在：

```bash
psql -l
```

確認 `localhost:5432` 能不能連到 `ucmarket`：

```bash
psql -h localhost -p 5432 -U 你的帳號 -d ucmarket -c "select current_user, current_database(), inet_server_addr(), inet_server_port();"
```

確認資料表是否存在：

```bash
psql -h localhost -p 5432 -U 你的帳號 -d ucmarket -c "\dt"
```

這次確認到 `ucmarket` database 存在，且包含測試需要的資料表：

```text
market_options
market_price_history
market_reviews
markets
positions
trades
user_sessions
users
wallet_transactions
wallets
```

## 解法

不要把個人本機 PostgreSQL 帳號直接寫死在 `application.properties`。

`backend/src/main/resources/application.properties` 應保留團隊共用設定，並允許用環境變數覆蓋：

```properties
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/ucmarket}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:postgres}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:post}
```

如果本機 PostgreSQL 可用帳號是 `eagleaby`，可以在 STS Run Configuration 或執行測試時設定環境變數：

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ucmarket
SPRING_DATASOURCE_USERNAME=eagleaby
SPRING_DATASOURCE_PASSWORD=
```

在 Terminal 執行測試時，可以用：

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ucmarket SPRING_DATASOURCE_USERNAME=eagleaby SPRING_DATASOURCE_PASSWORD= ./mvnw test
```

測試通過結果：

```text
Tests run: 53, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Docker 注意事項

如果有人是用 Docker 裝 PostgreSQL，要另外確認 `localhost:5432` 連到的是 Docker 裡的 PostgreSQL，還是自己電腦本機的 PostgreSQL。

每個人的資料庫帳號、密碼、port 可能不同，所以看到：

```text
Failed to load ApplicationContext
```

不要只看表面錯誤，要往下找最底層的 PostgreSQL 錯誤。這次真正原因是 datasource 帳號和本機 PostgreSQL role 不一致。
