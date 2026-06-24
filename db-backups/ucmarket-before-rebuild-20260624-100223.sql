--
-- PostgreSQL database dump
--

\restrict ue89Zm1CMh3oQr5OzzsVFnMcIVSrJeoZS12JgowsvFsv9AJkRnueodPzt828cOJ

-- Dumped from database version 16.14 (Homebrew)
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(32),
    admin_user_id uuid NOT NULL,
    action character varying(64) NOT NULL,
    target_type character varying(64),
    target_id uuid,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE admin_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_logs IS '後台操作稽核紀錄。';


--
-- Name: market_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    market_id uuid NOT NULL,
    label character varying(128) NOT NULL,
    min_value numeric(18,2),
    max_value numeric(18,2),
    pool numeric(18,2) DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_winning_option boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_market_options_pool CHECK ((pool >= (0)::numeric)),
    CONSTRAINT ck_market_options_range CHECK (((min_value IS NULL) OR (max_value IS NULL) OR (min_value <= max_value)))
);


--
-- Name: TABLE market_options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.market_options IS '進階多選項、次數型或數值區間市場的選項。';


--
-- Name: market_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    market_id uuid NOT NULL,
    option_id uuid,
    yes_price numeric(18,4),
    no_price numeric(18,4),
    option_price numeric(18,4),
    trade_volume numeric(18,2) DEFAULT 0 NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_market_price_history_binary_or_option CHECK ((((option_id IS NULL) AND (yes_price IS NOT NULL) AND (no_price IS NOT NULL) AND (option_price IS NULL)) OR ((option_id IS NOT NULL) AND (option_price IS NOT NULL)))),
    CONSTRAINT ck_market_price_history_no_price CHECK (((no_price IS NULL) OR (no_price >= (0)::numeric))),
    CONSTRAINT ck_market_price_history_option_price CHECK (((option_price IS NULL) OR (option_price >= (0)::numeric))),
    CONSTRAINT ck_market_price_history_trade_volume CHECK ((trade_volume >= (0)::numeric)),
    CONSTRAINT ck_market_price_history_yes_price CHECK (((yes_price IS NULL) OR (yes_price >= (0)::numeric)))
);


--
-- Name: TABLE market_price_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.market_price_history IS '市場價格與成交量歷史。';


--
-- Name: market_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    market_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    status character varying(32) NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    code character varying(32),
    CONSTRAINT ck_market_reviews_comment_required CHECK ((((status)::text = 'APPROVED'::text) OR ((comment IS NOT NULL) AND (btrim(comment) <> ''::text)))),
    CONSTRAINT ck_market_reviews_status CHECK (((status)::text = ANY ((ARRAY['APPROVED'::character varying, 'REJECTED'::character varying, 'CHANGES_REQUESTED'::character varying])::text[])))
);


--
-- Name: TABLE market_reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.market_reviews IS '管理員審核市場的紀錄。';


--
-- Name: markets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.markets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(64),
    market_type character varying(32) DEFAULT 'BINARY'::character varying NOT NULL,
    source_url text,
    resolution_rule text,
    close_at timestamp without time zone NOT NULL,
    status character varying(32) DEFAULT 'DRAFT'::character varying NOT NULL,
    result character varying(32),
    result_value numeric(18,2),
    yes_pool numeric(18,2) DEFAULT 100 NOT NULL,
    no_pool numeric(18,2) DEFAULT 100 NOT NULL,
    approved_at timestamp without time zone,
    approved_by uuid,
    resolved_at timestamp without time zone,
    resolved_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    code character varying(32),
    CONSTRAINT ck_markets_approved_pair CHECK ((((approved_at IS NULL) AND (approved_by IS NULL)) OR ((approved_at IS NOT NULL) AND (approved_by IS NOT NULL)))),
    CONSTRAINT ck_markets_market_type CHECK (((market_type)::text = ANY ((ARRAY['BINARY'::character varying, 'COUNT_RANGE'::character varying, 'MULTIPLE_CHOICE'::character varying])::text[]))),
    CONSTRAINT ck_markets_no_pool CHECK ((no_pool >= (0)::numeric)),
    CONSTRAINT ck_markets_resolution_lifecycle CHECK (((((status)::text = 'RESOLVED'::text) AND (result IS NOT NULL) AND (resolved_at IS NOT NULL) AND (resolved_by IS NOT NULL)) OR (((status)::text <> 'RESOLVED'::text) AND (result IS NULL) AND (resolved_at IS NULL) AND (resolved_by IS NULL)))),
    CONSTRAINT ck_markets_resolved_pair CHECK ((((resolved_at IS NULL) AND (resolved_by IS NULL)) OR ((resolved_at IS NOT NULL) AND (resolved_by IS NOT NULL)))),
    CONSTRAINT ck_markets_result CHECK (((result IS NULL) OR ((result)::text = ANY (ARRAY[('YES'::character varying)::text, ('NO'::character varying)::text])))),
    CONSTRAINT ck_markets_status CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('PENDING'::character varying)::text, ('ACTIVE'::character varying)::text, ('CLOSED'::character varying)::text, ('RESOLVED'::character varying)::text, ('REJECTED'::character varying)::text, ('CANCELED'::character varying)::text]))),
    CONSTRAINT ck_markets_submission_fields CHECK ((((status)::text = 'DRAFT'::text) OR ((source_url IS NOT NULL) AND (btrim(source_url) <> ''::text) AND (resolution_rule IS NOT NULL) AND (btrim(resolution_rule) <> ''::text)))),
    CONSTRAINT ck_markets_yes_pool CHECK ((yes_pool >= (0)::numeric))
);


--
-- Name: TABLE markets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.markets IS '預測市場主資料、審核狀態、流動池與結算結果。';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    market_id uuid,
    type character varying(32) NOT NULL,
    title character varying(128) NOT NULL,
    message text,
    reference_type character varying(32),
    reference_id uuid,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_notifications_type CHECK (((type)::text = ANY ((ARRAY['TRADE_SUCCESS'::character varying, 'MARKET_CLOSED'::character varying, 'MARKET_RESOLVED'::character varying, 'SYSTEM'::character varying, 'ADMIN'::character varying])::text[])))
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS '通知紀錄，用於交易成功、市場截止、結算等事件提醒。';


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    market_id uuid NOT NULL,
    option_id uuid,
    yes_shares numeric(18,4) DEFAULT 0 NOT NULL,
    no_shares numeric(18,4) DEFAULT 0 NOT NULL,
    yes_cost numeric(18,2) DEFAULT 0 NOT NULL,
    no_cost numeric(18,2) DEFAULT 0 NOT NULL,
    shares numeric(18,4),
    cost numeric(18,2),
    status character varying(32) DEFAULT 'OPEN'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_positions_cost CHECK (((cost IS NULL) OR (cost >= (0)::numeric))),
    CONSTRAINT ck_positions_no_cost CHECK ((no_cost >= (0)::numeric)),
    CONSTRAINT ck_positions_no_shares CHECK ((no_shares >= (0)::numeric)),
    CONSTRAINT ck_positions_shares CHECK (((shares IS NULL) OR (shares >= (0)::numeric))),
    CONSTRAINT ck_positions_status CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('SETTLED'::character varying)::text, ('CANCELED'::character varying)::text]))),
    CONSTRAINT ck_positions_yes_cost CHECK ((yes_cost >= (0)::numeric)),
    CONSTRAINT ck_positions_yes_shares CHECK ((yes_shares >= (0)::numeric))
);


--
-- Name: TABLE positions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.positions IS '使用者在市場中的持倉。MVP 使用 yes/no shares，進階市場使用 option_id。';


--
-- Name: seq_admin_log_code; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_admin_log_code
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_market_code; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_market_code
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_market_review_code; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_market_review_code
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_trade_code; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_trade_code
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_user_code; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_user_code
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    market_id uuid NOT NULL,
    option_id uuid,
    side character varying(32),
    action character varying(32) DEFAULT 'BUY'::character varying NOT NULL,
    amount numeric(18,2) NOT NULL,
    price numeric(18,4) NOT NULL,
    shares numeric(18,4) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    code character varying(32),
    CONSTRAINT ck_trades_action CHECK (((action)::text = ANY (ARRAY[('BUY'::character varying)::text, ('SELL'::character varying)::text]))),
    CONSTRAINT ck_trades_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT ck_trades_binary_or_option CHECK ((((side IS NOT NULL) AND (option_id IS NULL)) OR ((side IS NULL) AND (option_id IS NOT NULL)))),
    CONSTRAINT ck_trades_price CHECK ((price >= (0)::numeric)),
    CONSTRAINT ck_trades_shares CHECK ((shares > (0)::numeric)),
    CONSTRAINT ck_trades_side CHECK (((side IS NULL) OR ((side)::text = ANY (ARRAY[('YES'::character varying)::text, ('NO'::character varying)::text]))))
);


--
-- Name: TABLE trades; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trades IS '使用者買入或賣出的交易紀錄。';


--
-- Name: user_portfolio_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_portfolio_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wallet_balance numeric(18,2) DEFAULT 0 NOT NULL,
    position_value numeric(18,2) DEFAULT 0 NOT NULL,
    total_asset_value numeric(18,2) DEFAULT 0 NOT NULL,
    realized_profit numeric(18,2) DEFAULT 0 NOT NULL,
    unrealized_profit numeric(18,2) DEFAULT 0 NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_user_portfolio_snapshots_position_value CHECK ((position_value >= (0)::numeric)),
    CONSTRAINT ck_user_portfolio_snapshots_total_asset_value CHECK ((total_asset_value >= (0)::numeric)),
    CONSTRAINT ck_user_portfolio_snapshots_wallet_balance CHECK ((wallet_balance >= (0)::numeric))
);


--
-- Name: TABLE user_portfolio_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_portfolio_snapshots IS '個人資產歷史快照，用於個人績效折線圖。';


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token_hash character varying(128) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    ip_address character varying(64),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_user_sessions_expires_after_created CHECK ((expires_at > created_at)),
    CONSTRAINT ck_user_sessions_revoked_at_range CHECK (((revoked_at IS NULL) OR ((revoked_at >= created_at) AND (revoked_at <= expires_at))))
);


--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_sessions IS '登入 session 或 refresh token 紀錄。';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(32) NOT NULL,
    email character varying(128) NOT NULL,
    password_hash character varying(128) NOT NULL,
    role character varying(32) DEFAULT 'USER'::character varying NOT NULL,
    status character varying(32) DEFAULT 'ACTIVE'::character varying NOT NULL,
    reputation integer DEFAULT 0 NOT NULL,
    last_login_at timestamp without time zone,
    avatar_url text,
    bio text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    code character varying(32),
    CONSTRAINT ck_users_reputation CHECK ((reputation >= 0)),
    CONSTRAINT ck_users_role CHECK (((role)::text = ANY ((ARRAY['USER'::character varying, 'ADMIN'::character varying])::text[]))),
    CONSTRAINT ck_users_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'BANNED'::character varying, 'DISABLED'::character varying])::text[])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS '會員資料、角色、狀態與公開個人資料。';


--
-- Name: v_hot_markets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_hot_markets AS
 WITH trade_volume AS (
         SELECT trades.market_id,
            sum(trades.amount) AS total_trade_amount,
            count(*) AS trade_count
           FROM public.trades
          GROUP BY trades.market_id
        ), latest_history AS (
         SELECT DISTINCT ON (market_price_history.market_id) market_price_history.market_id,
            market_price_history.trade_volume AS latest_recorded_volume,
            market_price_history.recorded_at
           FROM public.market_price_history
          ORDER BY market_price_history.market_id, market_price_history.recorded_at DESC
        )
 SELECT m.id AS market_id,
    m.title,
    m.category,
    m.status,
    COALESCE(tv.total_trade_amount, (0)::numeric) AS total_trade_amount,
    COALESCE(tv.trade_count, (0)::bigint) AS trade_count,
    COALESCE(lh.latest_recorded_volume, (0)::numeric) AS latest_recorded_volume,
    lh.recorded_at AS latest_price_recorded_at
   FROM ((public.markets m
     LEFT JOIN trade_volume tv ON ((tv.market_id = m.id)))
     LEFT JOIN latest_history lh ON ((lh.market_id = m.id)));


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric(18,2) DEFAULT 0 NOT NULL,
    locked_balance numeric(18,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    CONSTRAINT ck_wallets_balance CHECK ((balance >= (0)::numeric)),
    CONSTRAINT ck_wallets_locked_balance CHECK ((locked_balance >= (0)::numeric)),
    CONSTRAINT ck_wallets_version CHECK ((version >= 0))
);


--
-- Name: TABLE wallets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wallets IS '每位使用者一個虛擬點數錢包，balance 是 ledger amount 加總後的快照。';


--
-- Name: v_ranking_assets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ranking_assets AS
 WITH latest_binary_price AS (
         SELECT DISTINCT ON (market_price_history.market_id) market_price_history.market_id,
            market_price_history.yes_price,
            market_price_history.no_price
           FROM public.market_price_history
          WHERE (market_price_history.option_id IS NULL)
          ORDER BY market_price_history.market_id, market_price_history.recorded_at DESC
        ), open_position_values AS (
         SELECT p.user_id,
            sum(((p.yes_shares * COALESCE(lbp.yes_price, (0)::numeric)) + (p.no_shares * COALESCE(lbp.no_price, (0)::numeric)))) AS open_position_value
           FROM ((public.positions p
             JOIN public.markets m ON ((m.id = p.market_id)))
             LEFT JOIN latest_binary_price lbp ON ((lbp.market_id = p.market_id)))
          WHERE (((p.status)::text = 'OPEN'::text) AND ((m.status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'CLOSED'::character varying])::text[])) AND (p.option_id IS NULL))
          GROUP BY p.user_id
        )
 SELECT u.id AS user_id,
    u.username,
    u.avatar_url,
    COALESCE(w.balance, (0)::numeric) AS wallet_balance,
    COALESCE(opv.open_position_value, (0)::numeric) AS open_position_value,
    (COALESCE(w.balance, (0)::numeric) + COALESCE(opv.open_position_value, (0)::numeric)) AS total_asset_value
   FROM ((public.users u
     LEFT JOIN public.wallets w ON ((w.user_id = u.id)))
     LEFT JOIN open_position_values opv ON ((opv.user_id = u.id)));


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    type character varying(32) NOT NULL,
    amount numeric(18,2) NOT NULL,
    balance_after numeric(18,2) NOT NULL,
    reference_type character varying(32),
    reference_id uuid,
    idempotency_key character varying(128),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb,
    CONSTRAINT ck_wallet_transactions_balance_after CHECK ((balance_after >= (0)::numeric)),
    CONSTRAINT ck_wallet_transactions_reference_type CHECK (((reference_type IS NULL) OR ((reference_type)::text = ANY (ARRAY[('BONUS'::character varying)::text, ('TRADE'::character varying)::text, ('MARKET'::character varying)::text, ('ADJUSTMENT'::character varying)::text, ('ADMIN'::character varying)::text, ('SYSTEM'::character varying)::text])))),
    CONSTRAINT ck_wallet_transactions_type CHECK (((type)::text = ANY (ARRAY[('SIGNUP_BONUS'::character varying)::text, ('TRADE_BUY'::character varying)::text, ('TRADE_SELL'::character varying)::text, ('RESOLUTION_PAYOUT'::character varying)::text, ('REFUND'::character varying)::text, ('BONUS'::character varying)::text, ('ADJUSTMENT'::character varying)::text])))
);


--
-- Name: TABLE wallet_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wallet_transactions IS '錢包異動流水帳，包含扣款、結算、退款與獎勵；寫入後不應修改。';


--
-- Name: v_ranking_profit; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ranking_profit AS
 WITH payouts AS (
         SELECT w.user_id,
            sum(wt.amount) AS total_payout
           FROM (public.wallet_transactions wt
             JOIN public.wallets w ON ((w.id = wt.wallet_id)))
          WHERE ((wt.type)::text = 'RESOLUTION_PAYOUT'::text)
          GROUP BY w.user_id
        ), settled_costs AS (
         SELECT positions.user_id,
            sum(((positions.yes_cost + positions.no_cost) + COALESCE(positions.cost, (0)::numeric))) AS settled_cost
           FROM public.positions
          WHERE ((positions.status)::text = 'SETTLED'::text)
          GROUP BY positions.user_id
        )
 SELECT u.id AS user_id,
    u.username,
    u.avatar_url,
    COALESCE(p.total_payout, (0)::numeric) AS total_payout,
    COALESCE(sc.settled_cost, (0)::numeric) AS settled_cost,
    (COALESCE(p.total_payout, (0)::numeric) - COALESCE(sc.settled_cost, (0)::numeric)) AS realized_profit
   FROM ((public.users u
     LEFT JOIN payouts p ON ((p.user_id = u.id)))
     LEFT JOIN settled_costs sc ON ((sc.user_id = u.id)));


--
-- Name: v_ranking_win_rate; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ranking_win_rate AS
 WITH settled_predictions AS (
         SELECT p.user_id,
            p.market_id,
                CASE
                    WHEN (((m.result)::text = 'YES'::text) AND (p.yes_shares > p.no_shares)) THEN 1
                    WHEN (((m.result)::text = 'NO'::text) AND (p.no_shares > p.yes_shares)) THEN 1
                    ELSE 0
                END AS is_correct
           FROM (public.positions p
             JOIN public.markets m ON ((m.id = p.market_id)))
          WHERE ((m.status)::text = 'RESOLVED'::text)
        )
 SELECT u.id AS user_id,
    u.username,
    u.avatar_url,
    count(sp.market_id) AS resolved_market_count,
    COALESCE(sum(sp.is_correct), (0)::bigint) AS correct_count,
        CASE
            WHEN (count(sp.market_id) = 0) THEN (0)::numeric
            ELSE round(((sum(sp.is_correct))::numeric / (count(sp.market_id))::numeric), 4)
        END AS win_rate
   FROM (public.users u
     LEFT JOIN settled_predictions sp ON ((sp.user_id = u.id)))
  GROUP BY u.id, u.username, u.avatar_url;


--
-- Data for Name: admin_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_logs (id, code, admin_user_id, action, target_type, target_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: market_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.market_options (id, market_id, label, min_value, max_value, pool, sort_order, is_winning_option) FROM stdin;
\.


--
-- Data for Name: market_price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.market_price_history (id, market_id, option_id, yes_price, no_price, option_price, trade_volume, recorded_at) FROM stdin;
\.


--
-- Data for Name: market_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.market_reviews (id, market_id, reviewer_id, status, comment, created_at, code) FROM stdin;
\.


--
-- Data for Name: markets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.markets (id, creator_id, title, description, category, market_type, source_url, resolution_rule, close_at, status, result, result_value, yes_pool, no_pool, approved_at, approved_by, resolved_at, resolved_by, created_at, updated_at, code) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, market_id, type, title, message, reference_type, reference_id, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.positions (id, user_id, market_id, option_id, yes_shares, no_shares, yes_cost, no_cost, shares, cost, status, updated_at) FROM stdin;
\.


--
-- Data for Name: trades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trades (id, user_id, market_id, option_id, side, action, amount, price, shares, created_at, code) FROM stdin;
\.


--
-- Data for Name: user_portfolio_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_portfolio_snapshots (id, user_id, wallet_balance, position_value, total_asset_value, realized_profit, unrealized_profit, recorded_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, refresh_token_hash, expires_at, revoked_at, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password_hash, role, status, reputation, last_login_at, avatar_url, bio, created_at, updated_at, code) FROM stdin;
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_transactions (id, wallet_id, type, amount, balance_after, reference_type, reference_id, idempotency_key, created_at, metadata) FROM stdin;
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallets (id, user_id, balance, locked_balance, created_at, updated_at, version) FROM stdin;
\.


--
-- Name: seq_admin_log_code; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seq_admin_log_code', 1, false);


--
-- Name: seq_market_code; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seq_market_code', 1, false);


--
-- Name: seq_market_review_code; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seq_market_review_code', 1, false);


--
-- Name: seq_trade_code; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seq_trade_code', 1, false);


--
-- Name: seq_user_code; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seq_user_code', 1, false);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: market_options market_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_options
    ADD CONSTRAINT market_options_pkey PRIMARY KEY (id);


--
-- Name: market_price_history market_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_price_history
    ADD CONSTRAINT market_price_history_pkey PRIMARY KEY (id);


--
-- Name: market_reviews market_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_reviews
    ADD CONSTRAINT market_reviews_pkey PRIMARY KEY (id);


--
-- Name: markets markets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT markets_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: admin_logs uk_admin_logs_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT uk_admin_logs_code UNIQUE (code);


--
-- Name: market_options uk_market_options_sort_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_options
    ADD CONSTRAINT uk_market_options_sort_order UNIQUE (market_id, sort_order);


--
-- Name: market_reviews uk_market_reviews_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_reviews
    ADD CONSTRAINT uk_market_reviews_code UNIQUE (code);


--
-- Name: markets uk_markets_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT uk_markets_code UNIQUE (code);


--
-- Name: trades uk_trades_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT uk_trades_code UNIQUE (code);


--
-- Name: user_sessions uk_user_sessions_refresh_token_hash; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT uk_user_sessions_refresh_token_hash UNIQUE (refresh_token_hash);


--
-- Name: users uk_users_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_users_code UNIQUE (code);


--
-- Name: users uk_users_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_users_email UNIQUE (email);


--
-- Name: users uk_users_username; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_users_username UNIQUE (username);


--
-- Name: wallets uk_wallets_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT uk_wallets_user_id UNIQUE (user_id);


--
-- Name: user_portfolio_snapshots user_portfolio_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_portfolio_snapshots
    ADD CONSTRAINT user_portfolio_snapshots_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_logs_admin_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_admin_created ON public.admin_logs USING btree (admin_user_id, created_at DESC);


--
-- Name: idx_admin_logs_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_target ON public.admin_logs USING btree (target_type, target_id);


--
-- Name: idx_market_options_market_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_options_market_id ON public.market_options USING btree (market_id);


--
-- Name: idx_market_price_history_market_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_price_history_market_id ON public.market_price_history USING btree (market_id);


--
-- Name: idx_market_price_history_option_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_price_history_option_id ON public.market_price_history USING btree (option_id);


--
-- Name: idx_market_price_history_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_price_history_recorded_at ON public.market_price_history USING btree (recorded_at);


--
-- Name: idx_market_reviews_market_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_reviews_market_id ON public.market_reviews USING btree (market_id);


--
-- Name: idx_market_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_reviews_reviewer_id ON public.market_reviews USING btree (reviewer_id);


--
-- Name: idx_markets_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_markets_approved_by ON public.markets USING btree (approved_by);


--
-- Name: idx_markets_close_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_markets_close_at ON public.markets USING btree (close_at);


--
-- Name: idx_markets_creator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_markets_creator_id ON public.markets USING btree (creator_id);


--
-- Name: idx_markets_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_markets_resolved_by ON public.markets USING btree (resolved_by);


--
-- Name: idx_markets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_markets_status ON public.markets USING btree (status);


--
-- Name: idx_notifications_market_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_market_id ON public.notifications USING btree (market_id);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_positions_market_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_market_id ON public.positions USING btree (market_id);


--
-- Name: idx_positions_option_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_option_id ON public.positions USING btree (option_id);


--
-- Name: idx_positions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_status ON public.positions USING btree (status);


--
-- Name: idx_positions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_user_id ON public.positions USING btree (user_id);


--
-- Name: idx_trades_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trades_created_at ON public.trades USING btree (created_at);


--
-- Name: idx_trades_market_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trades_market_id ON public.trades USING btree (market_id);


--
-- Name: idx_trades_option_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trades_option_id ON public.trades USING btree (option_id);


--
-- Name: idx_trades_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trades_user_id ON public.trades USING btree (user_id);


--
-- Name: idx_user_portfolio_snapshots_user_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_portfolio_snapshots_user_recorded ON public.user_portfolio_snapshots USING btree (user_id, recorded_at DESC);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_wallet_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions USING btree (created_at);


--
-- Name: idx_wallet_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_reference ON public.wallet_transactions USING btree (reference_type, reference_id);


--
-- Name: idx_wallet_transactions_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions USING btree (wallet_id);


--
-- Name: uk_positions_user_market_binary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_positions_user_market_binary ON public.positions USING btree (user_id, market_id) WHERE (option_id IS NULL);


--
-- Name: uk_positions_user_market_option; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_positions_user_market_option ON public.positions USING btree (user_id, market_id, option_id) WHERE (option_id IS NOT NULL);


--
-- Name: uk_wallet_transactions_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_wallet_transactions_idempotency_key ON public.wallet_transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: admin_logs fk_admin_logs_admin_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT fk_admin_logs_admin_user FOREIGN KEY (admin_user_id) REFERENCES public.users(id);


--
-- Name: market_options fk_market_options_market; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_options
    ADD CONSTRAINT fk_market_options_market FOREIGN KEY (market_id) REFERENCES public.markets(id);


--
-- Name: market_price_history fk_market_price_history_market; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_price_history
    ADD CONSTRAINT fk_market_price_history_market FOREIGN KEY (market_id) REFERENCES public.markets(id);


--
-- Name: market_price_history fk_market_price_history_option; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_price_history
    ADD CONSTRAINT fk_market_price_history_option FOREIGN KEY (option_id) REFERENCES public.market_options(id);


--
-- Name: market_reviews fk_market_reviews_market; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_reviews
    ADD CONSTRAINT fk_market_reviews_market FOREIGN KEY (market_id) REFERENCES public.markets(id);


--
-- Name: market_reviews fk_market_reviews_reviewer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_reviews
    ADD CONSTRAINT fk_market_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: markets fk_markets_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT fk_markets_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: markets fk_markets_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT fk_markets_creator FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: markets fk_markets_resolved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT fk_markets_resolved_by FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: notifications fk_notifications_market; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_market FOREIGN KEY (market_id) REFERENCES public.markets(id);


--
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: positions fk_positions_market; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT fk_positions_market FOREIGN KEY (market_id) REFERENCES public.markets(id);


--
-- Name: positions fk_positions_option; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT fk_positions_option FOREIGN KEY (option_id) REFERENCES public.market_options(id);


--
-- Name: positions fk_positions_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT fk_positions_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: trades fk_trades_market; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT fk_trades_market FOREIGN KEY (market_id) REFERENCES public.markets(id);


--
-- Name: trades fk_trades_option; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT fk_trades_option FOREIGN KEY (option_id) REFERENCES public.market_options(id);


--
-- Name: trades fk_trades_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT fk_trades_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_portfolio_snapshots fk_user_portfolio_snapshots_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_portfolio_snapshots
    ADD CONSTRAINT fk_user_portfolio_snapshots_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_sessions fk_user_sessions_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: wallet_transactions fk_wallet_transactions_wallet; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT fk_wallet_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: wallets fk_wallets_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ue89Zm1CMh3oQr5OzzsVFnMcIVSrJeoZS12JgowsvFsv9AJkRnueodPzt828cOJ

