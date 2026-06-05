package com.ucmarket.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RankingRepositoryTest {

	@Autowired
	private RankingRepository rankingRepository;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void findProfitRankingsCalculatesRealizedProfit() {
		UUID userId = UUID.randomUUID();
		UUID walletId = UUID.randomUUID();
		UUID marketId = UUID.randomUUID();
		String suffix = userId.toString().substring(0, 8);

		jdbcTemplate.update("""
				INSERT INTO users (
					id,
					username,
					email,
					password_hash
				)
				VALUES (?, ?, ?, ?)
				""",
				userId,
				"ranking_" + suffix,
				"ranking-" + suffix + "@example.com",
				"test-password-hash"
		);

		jdbcTemplate.update("""
				INSERT INTO wallets (
					id,
					user_id,
					balance,
					locked_balance,
					version
				)
				VALUES (?, ?, ?, ?, ?)
				""",
				walletId,
				userId,
				100.00,
				0.00,
				0
		);

		jdbcTemplate.update("""
				INSERT INTO markets (
					id,
					creator_id,
					title,
					close_at,
					status
				)
				VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'DRAFT')
				""",
				marketId,
				userId,
				"Ranking repository test market"
		);

		jdbcTemplate.update("""
				INSERT INTO positions (
					user_id,
					market_id,
					yes_shares,
					no_shares,
					yes_cost,
					no_cost,
					status
				)
				VALUES (?, ?, ?, ?, ?, ?, 'SETTLED')
				""",
				userId,
				marketId,
				20.00,
				0.00,
				12.00,
				0.00
		);

		jdbcTemplate.update("""
				INSERT INTO wallet_transactions (
					wallet_id,
					type,
					amount,
					balance_after,
					reference_type,
					reference_id,
					idempotency_key
				)
				VALUES (?, 'RESOLUTION_PAYOUT', ?, ?, 'MARKET', ?, ?)
				""",
				walletId,
				20.00,
				120.00,
				marketId,
				"ranking-test-" + suffix
		);
		
		List<RankingProfitRow> rankings = rankingRepository.findProfitRankings();

		RankingProfitRow ranking = rankings.stream()
				.filter(row -> row.getUserId().equals(userId))
				.findFirst()
				.orElseThrow();

		assertThat(ranking.getUsername()).isEqualTo("ranking_" + suffix);
		assertThat(ranking.getTotalPayout()).isEqualByComparingTo("20.00");
		assertThat(ranking.getSettledCost()).isEqualByComparingTo("12.00");
		assertThat(ranking.getRealizedProfit()).isEqualByComparingTo("8.00");
		
		
	}
	
	@Test
	void findWinRateRankingsCalculatesCorrectPredictionRate() {
		UUID userId = UUID.randomUUID();
		UUID yesMarketId = UUID.randomUUID();
		UUID noMarketId = UUID.randomUUID();
		String suffix = userId.toString().substring(0, 8);

		jdbcTemplate.update("""
				INSERT INTO users (
					id,
					username,
					email,
					password_hash
				)
				VALUES (?, ?, ?, ?)
				""",
				userId,
				"win_rate_" + suffix,
				"win-rate-" + suffix + "@example.com",
				"test-password-hash"
		);

		jdbcTemplate.update("""
				INSERT INTO markets (
					id,
					creator_id,
					title,
					close_at,
					status,
					result,
					resolved_at,
					resolved_by
				)
				VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'RESOLVED', 'YES', CURRENT_TIMESTAMP, ?)
				""",
				yesMarketId,
				userId,
				"Resolved YES market",
				userId
		);

		jdbcTemplate.update("""
				INSERT INTO markets (
					id,
					creator_id,
					title,
					close_at,
					status,
					result,
					resolved_at,
					resolved_by
				)
				VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'RESOLVED', 'NO', CURRENT_TIMESTAMP, ?)
				""",
				noMarketId,
				userId,
				"Resolved NO market",
				userId
		);

		jdbcTemplate.update("""
				INSERT INTO positions (
					user_id,
					market_id,
					yes_shares,
					no_shares,
					yes_cost,
					no_cost,
					status
				)
				VALUES (?, ?, ?, ?, ?, ?, 'SETTLED')
				""",
				userId,
				yesMarketId,
				10.00,
				0.00,
				5.00,
				0.00
		);

		jdbcTemplate.update("""
				INSERT INTO positions (
					user_id,
					market_id,
					yes_shares,
					no_shares,
					yes_cost,
					no_cost,
					status
				)
				VALUES (?, ?, ?, ?, ?, ?, 'SETTLED')
				""",
				userId,
				noMarketId,
				8.00,
				0.00,
				4.00,
				0.00
		);
		
		List<RankingWinRateRow> rankings = rankingRepository.findWinRateRankings();

		RankingWinRateRow ranking = rankings.stream()
				.filter(row -> row.getUserId().equals(userId))
				.findFirst()
				.orElseThrow();

		assertThat(ranking.getUsername()).isEqualTo("win_rate_" + suffix);
		assertThat(ranking.getResolvedMarketCount()).isEqualTo(2L);
		assertThat(ranking.getCorrectCount()).isEqualTo(1L);
		assertThat(ranking.getWinRate()).isEqualByComparingTo("0.5000");
	}
	
	@Test
	void findAssetRankingsCalculatesWalletAndOpenPositionValue() {
		UUID userId = UUID.randomUUID();
		UUID walletId = UUID.randomUUID();
		UUID marketId = UUID.randomUUID();
		String suffix = userId.toString().substring(0, 8);

		jdbcTemplate.update("""
				INSERT INTO users (
					id,
					username,
					email,
					password_hash
				)
				VALUES (?, ?, ?, ?)
				""",
				userId,
				"assets_" + suffix,
				"assets-" + suffix + "@example.com",
				"test-password-hash"
		);

		jdbcTemplate.update("""
				INSERT INTO wallets (
					id,
					user_id,
					balance,
					locked_balance,
					version
				)
				VALUES (?, ?, ?, ?, ?)
				""",
				walletId,
				userId,
				100.00,
				0.00,
				0
		);

		jdbcTemplate.update("""
				INSERT INTO markets (
					id,
					creator_id,
					title,
					source_url,
					resolution_rule,
					close_at,
					status
				)
				VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'ACTIVE')
				""",
				marketId,
				userId,
				"Assets ranking test market",
				"https://example.com/source",
				"Resolve by official source"
		);

		jdbcTemplate.update("""
				INSERT INTO market_price_history (
					market_id,
					yes_price,
					no_price,
					trade_volume
				)
				VALUES (?, ?, ?, ?)
				""",
				marketId,
				0.70,
				0.30,
				0.00
		);

		jdbcTemplate.update("""
				INSERT INTO positions (
					user_id,
					market_id,
					yes_shares,
					no_shares,
					yes_cost,
					no_cost,
					status
				)
				VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
				""",
				userId,
				marketId,
				10.00,
				5.00,
				6.00,
				2.00
		);

		List<RankingAssetsRow> rankings = rankingRepository.findAssetRankings();

		RankingAssetsRow ranking = rankings.stream()
				.filter(row -> row.getUserId().equals(userId))
				.findFirst()
				.orElseThrow();

		assertThat(ranking.getUsername()).isEqualTo("assets_" + suffix);
		assertThat(ranking.getWalletBalance()).isEqualByComparingTo("100.00");
		assertThat(ranking.getOpenPositionValue()).isEqualByComparingTo("8.50");
		assertThat(ranking.getTotalAssetValue()).isEqualByComparingTo("108.50");
	}
}