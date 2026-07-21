package com.ucmarket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.User;

public interface RankingRepository extends JpaRepository<User, UUID> {

	@Query(value = """
			WITH snapshot AS (
				SELECT CURRENT_TIMESTAMP AS as_of
			),
			payouts AS (
				SELECT w.user_id, SUM(wt.amount) AS total_payout
				FROM wallet_transactions wt
				JOIN wallets w ON w.id = wt.wallet_id
				WHERE wt.type = 'RESOLUTION_PAYOUT'
				GROUP BY w.user_id
			),
			settled_costs AS (
				SELECT p.user_id, SUM(p.yes_cost + p.no_cost) AS settled_cost
				FROM positions p
				WHERE p.status = 'SETTLED'
				GROUP BY p.user_id
			),
			settled_predictions AS (
				SELECT
					p.user_id,
					p.market_id,
					CASE
						WHEN m.result = 'YES' AND p.yes_shares > p.no_shares THEN 1
						WHEN m.result = 'NO' AND p.no_shares > p.yes_shares THEN 1
						ELSE 0
					END AS is_correct
				FROM positions p
				JOIN markets m ON m.id = p.market_id
				WHERE m.status = 'RESOLVED'
			),
			win_rates AS (
				SELECT
					user_id,
					COUNT(market_id) AS resolved_market_count,
					CASE
						WHEN COUNT(market_id) = 0 THEN 0
						ELSE ROUND(CAST(SUM(is_correct) AS NUMERIC) / COUNT(market_id), 4)
					END AS win_rate
				FROM settled_predictions
				GROUP BY user_id
			),
			latest_binary_price AS (
				SELECT DISTINCT ON (market_id) market_id, yes_price, no_price, recorded_at
				FROM market_price_history
				WHERE option_id IS NULL
				ORDER BY market_id, recorded_at DESC
			),
			open_position_values AS (
				SELECT
					p.user_id,
					SUM((p.yes_shares * COALESCE(lbp.yes_price, 0))
						+ (p.no_shares * COALESCE(lbp.no_price, 0))) AS open_position_value
				FROM positions p
				JOIN markets m ON m.id = p.market_id
				LEFT JOIN latest_binary_price lbp ON lbp.market_id = p.market_id
				WHERE p.status = 'OPEN'
					AND m.status IN ('ACTIVE', 'CLOSED')
					AND p.option_id IS NULL
				GROUP BY p.user_id
			),
			market_volumes AS (
				SELECT
					t.user_id,
					m.id AS market_id,
					m.title AS primary_market,
					SUM(t.amount) AS trade_amount,
					MAX(t.created_at) AS latest_trade_at
				FROM trades t
				JOIN markets m ON m.id = t.market_id
				GROUP BY t.user_id, m.id, m.title
			),
			primary_markets AS (
				SELECT user_id, primary_market
				FROM (
					SELECT
						user_id,
						primary_market,
						ROW_NUMBER() OVER (
							PARTITION BY user_id
							ORDER BY trade_amount DESC, latest_trade_at DESC, market_id ASC
						) AS primary_market_rank
					FROM market_volumes
				) ranked_markets
				WHERE primary_market_rank = 1
			),
			ranking_data AS (
				SELECT
					u.id AS user_id,
					u.username,
					u.code AS account,
					pm.primary_market,
					u.avatar_url,
					COALESCE(p.total_payout, 0) - COALESCE(sc.settled_cost, 0) AS realized_profit,
					COALESCE(wr.win_rate, 0) AS win_rate,
					COALESCE(wr.resolved_market_count, 0) AS resolved_market_count,
					COALESCE(w.balance, 0) + COALESCE(opv.open_position_value, 0) AS total_asset_value
				FROM users u
				LEFT JOIN payouts p ON p.user_id = u.id
				LEFT JOIN settled_costs sc ON sc.user_id = u.id
				LEFT JOIN win_rates wr ON wr.user_id = u.id
				LEFT JOIN wallets w ON w.user_id = u.id
				LEFT JOIN open_position_values opv ON opv.user_id = u.id
				LEFT JOIN primary_markets pm ON pm.user_id = u.id
				WHERE u.code <> 'SYS-WEATHER'
			),
			ranked_data AS (
				SELECT
					*,
					ROW_NUMBER() OVER (
						ORDER BY
							CASE WHEN :metric = 'profit' THEN realized_profit END DESC,
							CASE WHEN :metric = 'win-rate' THEN win_rate END DESC,
							CASE WHEN :metric = 'win-rate' THEN resolved_market_count END DESC,
							CASE WHEN :metric = 'assets' THEN total_asset_value END DESC,
							username ASC
					) AS rank
				FROM ranking_data
			)
			SELECT
				rd.rank AS "rank",
				rd.user_id AS "userId",
				rd.username AS "username",
				rd.account AS "account",
				rd.primary_market AS "primaryMarket",
				rd.avatar_url AS "avatarUrl",
				rd.realized_profit AS "realizedProfit",
				rd.win_rate AS "winRate",
				rd.resolved_market_count AS "resolvedMarketCount",
				rd.total_asset_value AS "totalAssetValue",
				s.as_of AS "asOf"
			FROM snapshot s
			LEFT JOIN ranked_data rd ON TRUE
			ORDER BY rd.rank
			LIMIT 1000
			""", nativeQuery = true)
	List<RankingSnapshotRow> findRankingSnapshot(@Param("metric") String metric);

	@Query(value = """
			WITH payouts AS (
				SELECT
					w.user_id,
					SUM(wt.amount) AS total_payout
				FROM wallet_transactions wt
				JOIN wallets w ON w.id = wt.wallet_id
				WHERE wt.type = 'RESOLUTION_PAYOUT'
				GROUP BY w.user_id
			),
			settled_costs AS (
				SELECT
					p.user_id,
					SUM(p.yes_cost + p.no_cost) AS settled_cost
				FROM positions p
				WHERE p.status = 'SETTLED'
				GROUP BY p.user_id
			)
			SELECT
				u.id AS "userId",
				u.username AS "username",
				u.code AS "account",
				(
					SELECT m.title
					FROM trades t
					JOIN markets m ON m.id = t.market_id
					WHERE t.user_id = u.id
					GROUP BY m.id, m.title
					ORDER BY SUM(t.amount) DESC, MAX(t.created_at) DESC, m.id ASC
					LIMIT 1
				) AS "primaryMarket",
				u.avatar_url AS "avatarUrl",
				COALESCE(p.total_payout, 0) AS "totalPayout",
				COALESCE(sc.settled_cost, 0) AS "settledCost",
				COALESCE(p.total_payout, 0) - COALESCE(sc.settled_cost, 0) AS "realizedProfit"
			FROM users u
			LEFT JOIN payouts p ON p.user_id = u.id
			LEFT JOIN settled_costs sc ON sc.user_id = u.id
			WHERE u.code <> 'SYS-WEATHER'
			ORDER BY "realizedProfit" DESC, u.username ASC
			""", nativeQuery = true)
	List<RankingProfitRow> findProfitRankings();
	
	@Query(value = """
			WITH settled_predictions AS (
				SELECT
					p.user_id,
					p.market_id,
					CASE
						WHEN m.result = 'YES' AND p.yes_shares > p.no_shares THEN 1
						WHEN m.result = 'NO' AND p.no_shares > p.yes_shares THEN 1
						ELSE 0
					END AS is_correct
				FROM positions p
				JOIN markets m ON m.id = p.market_id
				WHERE m.status = 'RESOLVED'
			)
			SELECT
				u.id AS "userId",
				u.username AS "username",
				u.code AS "account",
				(
					SELECT m.title
					FROM trades t
					JOIN markets m ON m.id = t.market_id
					WHERE t.user_id = u.id
					GROUP BY m.id, m.title
					ORDER BY SUM(t.amount) DESC, MAX(t.created_at) DESC, m.id ASC
					LIMIT 1
				) AS "primaryMarket",
				u.avatar_url AS "avatarUrl",
				COUNT(sp.market_id) AS "resolvedMarketCount",
				COALESCE(SUM(sp.is_correct), 0) AS "correctCount",
				CASE
					WHEN COUNT(sp.market_id) = 0 THEN 0
					ELSE ROUND(CAST(SUM(sp.is_correct) AS NUMERIC) / COUNT(sp.market_id), 4)
				END AS "winRate"
			FROM users u
			LEFT JOIN settled_predictions sp ON sp.user_id = u.id
			WHERE u.code <> 'SYS-WEATHER'
			GROUP BY u.id, u.username, u.code, u.avatar_url
			ORDER BY "winRate" DESC, "resolvedMarketCount" DESC, u.username ASC
			""", nativeQuery = true)
	List<RankingWinRateRow> findWinRateRankings();
	
	@Query(value = """
			WITH latest_binary_price AS (
				SELECT DISTINCT ON (market_id)
					market_id,
					yes_price,
					no_price,
					recorded_at
				FROM market_price_history
				WHERE option_id IS NULL
				ORDER BY market_id, recorded_at DESC
			),
			open_position_values AS (
				SELECT
					p.user_id,
					SUM(
						(p.yes_shares * COALESCE(
							lbp.yes_price,
							0
						))
						+ (p.no_shares * COALESCE(
							lbp.no_price,
							0
						))
					) AS open_position_value
				FROM positions p
				JOIN markets m ON m.id = p.market_id
				LEFT JOIN latest_binary_price lbp ON lbp.market_id = p.market_id
				WHERE p.status = 'OPEN'
					AND m.status IN ('ACTIVE', 'CLOSED')
					AND p.option_id IS NULL
				GROUP BY p.user_id
			)
			SELECT
				u.id AS "userId",
				u.username AS "username",
				u.code AS "account",
				(
					SELECT m.title
					FROM trades t
					JOIN markets m ON m.id = t.market_id
					WHERE t.user_id = u.id
					GROUP BY m.id, m.title
					ORDER BY SUM(t.amount) DESC, MAX(t.created_at) DESC, m.id ASC
					LIMIT 1
				) AS "primaryMarket",
				u.avatar_url AS "avatarUrl",
				COALESCE(w.balance, 0) AS "walletBalance",
				COALESCE(opv.open_position_value, 0) AS "openPositionValue",
				COALESCE(w.balance, 0) + COALESCE(opv.open_position_value, 0) AS "totalAssetValue"
			FROM users u
			LEFT JOIN wallets w ON w.user_id = u.id
			LEFT JOIN open_position_values opv ON opv.user_id = u.id
			WHERE u.code <> 'SYS-WEATHER'
			ORDER BY "totalAssetValue" DESC, u.username ASC
			""", nativeQuery = true)
	List<RankingAssetsRow> findAssetRankings();
}
