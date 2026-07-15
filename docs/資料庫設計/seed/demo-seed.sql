-- ============================================================================
-- UcMarket demo seed（程序化、冪等、可重複執行）
-- ----------------------------------------------------------------------------
-- 目的：讓全新部署環境一鍵擁有「符合後台產生規格」的自洽假資料。
--
-- 遵循後端市場生命週期規格（MarketService）：
--   建立(DRAFT) → 送審(PENDING) → 核准(ACTIVE)
--   核准同時寫入 market_reviews(APPROVED) + admin_logs(MARKET_APPROVE)
--   結算(RESOLVED) 另寫 admin_logs(MARKET_RESOLVE)
--   ——本 seed 對每個已核准市場都補齊這些審核/稽核軌跡，
--     使資料等同「真的從後台一步步建立、核准、結算」出來。
--
-- 交易/結算數字皆照真實邏輯逐筆演算：
--   賠率 = 總池 ÷ 該側池，clamp 1.5~5.0        （getMarketOdds）
--   shares = amount ÷ odds                       （placeTrade）
--   結算 payout = 該側 cost × 總池 ÷ 該側池       （calculatePayout，彩池對分）
--
-- 用法（不綁定資料庫名稱）：
--   1. 建 schema： psql -d <dbname> -f ucmarket-ddl.sql
--   2. 灌 seed：   psql -d <dbname> -f demo-seed.sql
--   重跑 = 開頭自動清空後重灌，可反覆執行、隨時還原。
--
-- 主角帳號：eagle@gmail.com / 密碼 password（ADMIN，暱稱 eagle）
-- ============================================================================

SET client_encoding = 'UTF8';

BEGIN;

-- ---------- STEP 0：清空所有業務資料（保留 schema）----------
TRUNCATE TABLE
    wallet_transactions, trades, positions, market_price_history,
    market_reviews, market_options, notifications, admin_logs,
    user_portfolio_snapshots, markets, wallets, user_sessions,
    user_oauth_accounts, users
    RESTART IDENTITY CASCADE;

DO $$
BEGIN
    BEGIN ALTER SEQUENCE seq_user_code          RESTART 1; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER SEQUENCE seq_market_code        RESTART 1; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER SEQUENCE seq_trade_code         RESTART 1; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER SEQUENCE seq_admin_log_code     RESTART 1; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER SEQUENCE seq_market_review_code RESTART 1; EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- ---------- STEP 1：程序化生成 ----------
DO $$
DECLARE
    PW CONSTANT text := '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS'; -- 明文 "password"

    admin_id   uuid;
    user_ids   uuid[] := ARRAY[]::uuid[];
    market_ids uuid[] := ARRAY[]::uuid[];

    v_bonus numeric;
    uid uuid;
    wid uuid;

    m_titles text[] := ARRAY[
        '2026 台灣地方選舉整體投票率會超過 65% 嗎？',
        '2026 Q2 台灣 CPI 年增率會超過 2% 嗎？',
        '中華隊會晉級 2026 世界棒球經典賽八強嗎？',
        'OpenAI 會在 2026 年內發表 GPT-6 嗎？',
        '比特幣 2026 年底前會突破 15 萬美元嗎？',
        '2026 金曲獎最佳專輯會由獨立樂團拿下嗎？',
        '台北捷運環狀線南環段會在 2026 年通車嗎？',
        '美國聯準會 2026 上半年會再次升息嗎？',
        '2025 台灣全年 GDP 成長率會超過 3% 嗎？',
        '台灣隊會在 2025 亞洲棒球錦標賽奪金嗎？',
        '台積電 2025 Q4 單季營收會創歷史新高嗎？',
        '2024 美國總統大選由共和黨勝出？',
        '以太坊 2025 年內會完成下一次重大網路升級？',
        '阿根廷會贏得 2024 美洲盃冠軍？',
        '2024 台灣全年通膨率會低於 2%？'
    ];
    m_cats text[] := ARRAY[
        '政治','經濟','體育','科技','加密貨幣','娛樂','社會','國際',
        '經濟','體育','科技','政治','加密貨幣','體育','經濟'
    ];
    m_targets text[] := ARRAY[
        'ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE',
        'CLOSED','CLOSED','CLOSED',
        'RESOLVED','RESOLVED','RESOLVED','RESOLVED'
    ];
    m_results text[] := ARRAY[
        NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,
        'YES','YES','YES','NO'
    ];

    i int; mi int; t int; n_trades int;
    v_status text; v_close timestamp; v_created timestamp; v_creator uuid;
    v_yes numeric; v_no numeric; v_total numeric; v_raw numeric;
    v_odds numeric; v_shares numeric; v_amount numeric; v_side text;
    v_bal numeric; v_trade_id uuid; v_pos_id uuid;
    v_result text; v_payout numeric;
    rec RECORD;
    r double precision;
BEGIN
    PERFORM setseed(0.42);   -- 固定亂數種子 → 每次重跑結果一致

    -- ===== 1a. 建 20 個 user + 錢包 + SIGNUP_BONUS =====
    FOR i IN 1..20 LOOP
        uid := gen_random_uuid();
        user_ids := array_append(user_ids, uid);

        v_bonus := CASE
                        WHEN i = 1 THEN 100000
                        WHEN i BETWEEN 2 AND 6 THEN 50000
                        WHEN i BETWEEN 7 AND 15 THEN 20000
                        ELSE 10000
                   END;

        INSERT INTO users (id, code, username, email, password_hash, role, status,
                           reputation, created_at, updated_at)
        VALUES (
            uid,
            'U' || lpad(nextval('seq_user_code')::text, 4, '0'),
            CASE WHEN i = 1 THEN 'eagle'
                 WHEN i BETWEEN 2 AND 6 THEN 'trader' || lpad(i::text, 2, '0')
                 WHEN i BETWEEN 7 AND 15 THEN 'member' || lpad(i::text, 2, '0')
                 ELSE 'rookie' || lpad(i::text, 2, '0') END,
            CASE WHEN i = 1 THEN 'eagle@gmail.com'
                 ELSE 'u' || lpad(i::text, 2, '0') || '@ucmarket.test' END,
            PW,
            CASE WHEN i = 1 THEN 'ADMIN' ELSE 'USER' END,
            CASE WHEN i = 20 THEN 'BANNED' ELSE 'ACTIVE' END,
            CASE WHEN i = 1 THEN 300
                 WHEN i BETWEEN 2 AND 6 THEN 120 + i * 10
                 WHEN i BETWEEN 7 AND 15 THEN 30 + i
                 ELSE 0 END,
            now() - ((90 - i * 3) || ' days')::interval,
            now() - ((90 - i * 3) || ' days')::interval
        );

        wid := gen_random_uuid();
        INSERT INTO wallets (id, user_id, balance, created_at, updated_at)
        VALUES (wid, uid, v_bonus, now() - ((90 - i * 3) || ' days')::interval, now());

        INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_after,
                                         reference_type, idempotency_key, created_at)
        VALUES (gen_random_uuid(), wid, 'SIGNUP_BONUS', v_bonus, v_bonus,
                'BONUS', 'signup_' || uid, now() - ((90 - i * 3) || ' days')::interval);
    END LOOP;

    admin_id := user_ids[1];   -- eagle

    -- ===== 1b. 建 15 個市場，並補齊「核准軌跡」（符合後台產生規格）=====
    --   每個市場都是已核准狀態，故補：market_reviews(APPROVED) + admin_logs(MARKET_APPROVE)
    FOR i IN 1..15 LOOP
        uid := gen_random_uuid();
        market_ids := array_append(market_ids, uid);

        -- RESOLVED 的市場先建為 ACTIVE（結算階段才改 RESOLVED，符合 lifecycle CHECK）
        v_status := CASE WHEN m_targets[i] = 'RESOLVED' THEN 'ACTIVE' ELSE m_targets[i] END;

        v_created := now() - ((30 + (random() * 60)::int) || ' days')::interval;
        v_close   := CASE
                        WHEN m_targets[i] = 'ACTIVE' THEN now() + ((15 + (random() * 45)::int) || ' days')::interval
                        WHEN m_targets[i] = 'CLOSED' THEN now() - ((1  + (random() * 9)::int)  || ' days')::interval
                        ELSE now() - ((20 + (random() * 40)::int) || ' days')::interval
                     END;
        v_creator := user_ids[1 + (random() * 5)::int];

        INSERT INTO markets (id, code, creator_id, title, description, category,
                             market_type, source_url, resolution_rule, close_at, status,
                             yes_pool, no_pool, approved_at, approved_by, created_at, updated_at)
        VALUES (
            uid,
            'MKT-' || lpad(nextval('seq_market_code')::text, 4, '0'),
            v_creator,
            m_titles[i],
            m_titles[i] || '（以官方公開資料為準）',
            m_cats[i],
            'BINARY',
            'https://example.com/source/' || i,
            '以官方公布之最終結果為準。',
            v_close,
            v_status,
            100, 100,
            v_created, admin_id,
            v_created, v_created
        );

        -- 核准軌跡①：審核紀錄（APPROVED，comment 允許 NULL）
        INSERT INTO market_reviews (id, code, market_id, reviewer_id, status, comment, created_at)
        VALUES (gen_random_uuid(),
                'MRV-' || lpad(nextval('seq_market_review_code')::text, 4, '0'),
                uid, admin_id, 'APPROVED', NULL, v_created);

        -- 核准軌跡②：後台稽核紀錄（對應 MarketService.approveMarket 的 admin_log）
        INSERT INTO admin_logs (id, code, admin_user_id, action, target_type, target_id, metadata, created_at)
        VALUES (gen_random_uuid(),
                'ALG-' || lpad(nextval('seq_admin_log_code')::text, 4, '0'),
                admin_id, 'MARKET_APPROVE', 'MARKET', uid,
                '{"status":"ACTIVE"}'::jsonb, v_created);
    END LOOP;

    -- ===== 1c. 模擬交易（照真實下單邏輯逐筆演算）=====
    FOR mi IN 1..15 LOOP
        v_yes := 100; v_no := 100;
        n_trades := 4 + (random() * 4)::int;

        FOR t IN 1..n_trades LOOP
            IF mi >= 12 AND t = 1 THEN
                uid := admin_id;                 -- eagle 對 RESOLVED 市場固定押 YES（第15檔 result=NO → 故意輸一場）
                v_side := 'YES';
                v_amount := 1000 + (random() * 10)::int * 100;
            ELSE
                r := random();
                IF r < 0.70 THEN
                    uid := user_ids[1 + (random() * 5)::int];
                ELSE
                    uid := user_ids[7 + (random() * 8)::int];
                END IF;
                v_side   := CASE WHEN random() < 0.55 THEN 'YES' ELSE 'NO' END;
                v_amount := 100 + (random() * 19)::int * 100;
            END IF;

            SELECT balance INTO v_bal FROM wallets WHERE user_id = uid;
            IF v_bal < v_amount THEN CONTINUE; END IF;

            v_total := v_yes + v_no;
            v_raw   := v_total / CASE WHEN v_side = 'YES' THEN v_yes ELSE v_no END;
            v_odds  := least(5.0, greatest(1.5, round(v_raw, 4)));
            v_shares := round(v_amount / v_odds, 4);

            INSERT INTO trades (id, code, user_id, market_id, side, action,
                                amount, price, shares, created_at)
            VALUES (gen_random_uuid(),
                    'TRD-' || lpad(nextval('seq_trade_code')::text, 5, '0'),
                    uid, market_ids[mi], v_side, 'BUY',
                    v_amount, v_odds, v_shares, now())
            RETURNING id INTO v_trade_id;

            UPDATE wallets SET balance = balance - v_amount, updated_at = now()
            WHERE user_id = uid RETURNING id, balance INTO wid, v_bal;

            INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_after,
                                             reference_type, reference_id, idempotency_key, created_at)
            VALUES (gen_random_uuid(), wid, 'TRADE_BUY', -v_amount, v_bal,
                    'TRADE', v_trade_id, 'trade_buy_' || v_trade_id, now());

            SELECT id INTO v_pos_id FROM positions
            WHERE user_id = uid AND market_id = market_ids[mi] AND option_id IS NULL;

            IF FOUND THEN
                IF v_side = 'YES' THEN
                    UPDATE positions SET yes_shares = yes_shares + v_shares,
                                         yes_cost   = yes_cost + v_amount,
                                         updated_at = now() WHERE id = v_pos_id;
                ELSE
                    UPDATE positions SET no_shares = no_shares + v_shares,
                                         no_cost    = no_cost + v_amount,
                                         updated_at = now() WHERE id = v_pos_id;
                END IF;
            ELSE
                INSERT INTO positions (id, user_id, market_id, option_id,
                                       yes_shares, no_shares, yes_cost, no_cost, status, updated_at)
                VALUES (gen_random_uuid(), uid, market_ids[mi], NULL,
                        CASE WHEN v_side = 'YES' THEN v_shares ELSE 0 END,
                        CASE WHEN v_side = 'NO'  THEN v_shares ELSE 0 END,
                        CASE WHEN v_side = 'YES' THEN v_amount ELSE 0 END,
                        CASE WHEN v_side = 'NO'  THEN v_amount ELSE 0 END,
                        'OPEN', now());
            END IF;

            IF v_side = 'YES' THEN v_yes := v_yes + v_amount; ELSE v_no := v_no + v_amount; END IF;
        END LOOP;

        UPDATE markets SET yes_pool = v_yes, no_pool = v_no, updated_at = now()
        WHERE id = market_ids[mi];
    END LOOP;

    -- ===== 1d. 9~11 改為 CLOSED（已截止待結算，result 仍 NULL）=====
    UPDATE markets SET status = 'CLOSED', updated_at = now()
    WHERE id IN (market_ids[9], market_ids[10], market_ids[11]);

    -- ===== 1e. 結算 12~15（彩池對分 payout + MARKET_RESOLVE 稽核紀錄）=====
    FOR mi IN 12..15 LOOP
        v_result := m_results[mi];
        SELECT yes_pool, no_pool INTO v_yes, v_no FROM markets WHERE id = market_ids[mi];
        v_total := v_yes + v_no;

        FOR rec IN SELECT * FROM positions WHERE market_id = market_ids[mi] AND status = 'OPEN' LOOP
            IF v_result = 'YES' AND v_yes > 0 THEN
                v_payout := round(rec.yes_cost * v_total / v_yes, 2);
            ELSIF v_result = 'NO' AND v_no > 0 THEN
                v_payout := round(rec.no_cost * v_total / v_no, 2);
            ELSE
                v_payout := 0;
            END IF;

            IF v_payout > 0 THEN
                UPDATE wallets SET balance = balance + v_payout, updated_at = now()
                WHERE user_id = rec.user_id RETURNING id, balance INTO wid, v_bal;

                INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_after,
                                                 reference_type, reference_id, idempotency_key, created_at)
                VALUES (gen_random_uuid(), wid, 'RESOLUTION_PAYOUT', v_payout, v_bal,
                        'MARKET', market_ids[mi], 'payout_' || rec.id, now());
            END IF;

            UPDATE positions SET status = 'SETTLED', updated_at = now() WHERE id = rec.id;
        END LOOP;

        UPDATE markets
        SET status = 'RESOLVED', result = v_result,
            resolved_at = now(), resolved_by = admin_id, updated_at = now()
        WHERE id = market_ids[mi];

        -- 結算稽核紀錄（對應 MarketService.resolveMarket 的 admin_log）
        INSERT INTO admin_logs (id, code, admin_user_id, action, target_type, target_id, metadata, created_at)
        VALUES (gen_random_uuid(),
                'ALG-' || lpad(nextval('seq_admin_log_code')::text, 4, '0'),
                admin_id, 'MARKET_RESOLVE', 'MARKET', market_ids[mi],
                ('{"result":"' || v_result || '"}')::jsonb, now());
    END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- 試跑驗證
-- ============================================================================
\echo ''
\echo '===== 各表筆數（含審核軌跡）====='
SELECT 'users' AS t, count(*) FROM users
UNION ALL SELECT 'markets', count(*) FROM markets
UNION ALL SELECT 'trades', count(*) FROM trades
UNION ALL SELECT 'positions', count(*) FROM positions
UNION ALL SELECT 'wallet_transactions', count(*) FROM wallet_transactions
UNION ALL SELECT 'market_reviews', count(*) FROM market_reviews
UNION ALL SELECT 'admin_logs', count(*) FROM admin_logs;

\echo ''
\echo '===== 市場狀態分佈 ====='
SELECT status, count(*) FROM markets GROUP BY status ORDER BY status;

\echo ''
\echo '===== 審核軌跡對照（每個市場應各有 1 筆 APPROVED review + 1 筆 MARKET_APPROVE log）====='
SELECT
    (SELECT count(*) FROM market_reviews WHERE status = 'APPROVED') AS approved_reviews,
    (SELECT count(*) FROM admin_logs WHERE action = 'MARKET_APPROVE') AS approve_logs,
    (SELECT count(*) FROM admin_logs WHERE action = 'MARKET_RESOLVE') AS resolve_logs;

\echo ''
\echo '===== 賠率是否脫離 2（總池÷該側，clamp 1.5~5）====='
SELECT code, status, yes_pool, no_pool,
       round(least(5.0, greatest(1.5, (yes_pool + no_pool) / yes_pool)), 2) AS yes_odds,
       round(least(5.0, greatest(1.5, (yes_pool + no_pool) / no_pool)), 2)  AS no_odds
FROM markets ORDER BY code;

\echo ''
\echo '===== 利潤榜 Top 8 ====='
SELECT u.username,
       COALESCE(SUM(CASE WHEN wt.type = 'RESOLUTION_PAYOUT' THEN wt.amount ELSE 0 END), 0)
     - COALESCE(SUM(CASE WHEN wt.type = 'TRADE_BUY' THEN -wt.amount ELSE 0 END), 0) AS realized_profit
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id
LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id
GROUP BY u.username
ORDER BY realized_profit DESC
LIMIT 8;
