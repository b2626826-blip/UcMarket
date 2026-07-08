package com.ucmarket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.ucmarket.entity.User;

public interface RankingRepository extends JpaRepository<User, UUID> {

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
				u.avatar_url AS "avatarUrl",
				COALESCE(p.total_payout, 0) AS "totalPayout",
				COALESCE(sc.settled_cost, 0) AS "settledCost",
				COALESCE(p.total_payout, 0) - COALESCE(sc.settled_cost, 0) AS "realizedProfit"
			FROM users u
			LEFT JOIN payouts p ON p.user_id = u.id
			LEFT JOIN settled_costs sc ON sc.user_id = u.id
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
				u.avatar_url AS "avatarUrl",
				COUNT(sp.market_id) AS "resolvedMarketCount",
				COALESCE(SUM(sp.is_correct), 0) AS "correctCount",
				CASE
					WHEN COUNT(sp.market_id) = 0 THEN 0
					ELSE ROUND(CAST(SUM(sp.is_correct) AS NUMERIC) / COUNT(sp.market_id), 4)
				END AS "winRate"
			FROM users u
			LEFT JOIN settled_predictions sp ON sp.user_id = u.id
			GROUP BY u.id, u.username, u.avatar_url
			ORDER BY "winRate" DESC, "resolvedMarketCount" DESC, u.username ASC
			""", nativeQuery = true)
	List<RankingWinRateRow> findWinRateRankings();
	
	@Query(value = """
			WITH open_position_values AS (
				SELECT
					p.user_id,
					SUM(
						(p.yes_shares * m.yes_pool / (m.yes_pool + m.no_pool))
						+ (p.no_shares * m.no_pool / (m.yes_pool + m.no_pool))
					) AS open_position_value
				FROM positions p
				JOIN markets m ON m.id = p.market_id
				WHERE p.status = 'OPEN'
					AND m.status IN ('ACTIVE', 'CLOSED')
					AND (m.yes_pool + m.no_pool) > 0
				GROUP BY p.user_id
			)
			SELECT
				u.id AS "userId",
				u.username AS "username",
				u.avatar_url AS "avatarUrl",
				COALESCE(w.balance, 0) AS "walletBalance",
				COALESCE(opv.open_position_value, 0) AS "openPositionValue",
				COALESCE(w.balance, 0) + COALESCE(opv.open_position_value, 0) AS "totalAssetValue"
			FROM users u
			LEFT JOIN wallets w ON w.user_id = u.id
			LEFT JOIN open_position_values opv ON opv.user_id = u.id
			ORDER BY "totalAssetValue" DESC, u.username ASC
			""", nativeQuery = true)
	List<RankingAssetsRow> findAssetRankings();
}
