package com.ucmarket.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.entity.User;
import com.ucmarket.repository.CurrentAffairsMarketRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.repository.UserRepository;

@DataJpaTest
class CurrentAffairsMarketRepositoryIntegrationTest {

	@Autowired
	private CurrentAffairsMarketRepository currentAffairsMarketRepository;
	@Autowired
	private MarketRepository marketRepository;
	@Autowired
	private TradeRepository tradeRepository;
	@Autowired
	private UserRepository userRepository;

	@Test
	void findPageWithVolume_ordersByTotalTradeAmountBeforePaging() {
		User user = userRepository.save(new User("popular-query-user", "popular-query@example.com", "password"));
		Market lowVolume = saveActiveMarket(user, "P2 low-volume market");
		Market highVolume = saveActiveMarket(user, "P2 high-volume market");

		tradeRepository.save(new Trade(user.getId(), lowVolume.getId(), MarketSide.YES, TradeAction.BUY,
				new BigDecimal("1"), new BigDecimal("0.5"), new BigDecimal("2")));
		tradeRepository.save(new Trade(user.getId(), highVolume.getId(), MarketSide.YES, TradeAction.BUY,
				new BigDecimal("1000000"), new BigDecimal("0.5"), new BigDecimal("2000000")));

		var markets = currentAffairsMarketRepository
				.findPageWithVolume(MarketStatus.ACTIVE, "popular", PageRequest.of(0, 1));

		assertEquals("P2 high-volume market", markets.getContent().getFirst().title());
		assertEquals(0, markets.getContent().getFirst().volume().compareTo(new BigDecimal("1000000")));
		assertTrue(markets.getTotalElements() >= 2);
	}

	private Market saveActiveMarket(User user, String title) {
		Market market = new Market(title, "描述", "CURRENT_AFFAIRS", null, null,
				null, LocalDateTime.now().plusDays(1));
		market.setCreatorId(user.getId());
		market.changeStatus(MarketStatus.ACTIVE);
		return marketRepository.save(market);
	}
}
