package com.ucmarket.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

@Service
public class TradeService {

	private final MarketRepository marketRepository;
	private final TradeRepository tradeRepository;
	private final TradeQuoteService tradeQuoteService;
	private final WalletService walletService;
	private final PositionService positionService;

	public TradeService(MarketRepository marketRepository, TradeRepository tradeRepository,
			TradeQuoteService tradeQuoteService, WalletService walletService, PositionService positionService) {
		this.marketRepository = marketRepository;
		this.tradeRepository = tradeRepository;
		this.tradeQuoteService = tradeQuoteService;
		this.walletService = walletService;
		this.positionService = positionService;
	}

	@Transactional
	public Trade placeTrade(UUID userId, TradeRequest request) {
		Market market = marketRepository.findById(request.marketId())
				.orElseThrow(() -> new RuntimeException("市場不存在"));
		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new IllegalStateException("該市場目前無法下單");
		}

		BigDecimal amount = request.amount();
		BigDecimal currentOdds = tradeQuoteService.getMarketOdds(market, request.side());
		if (currentOdds.compareTo(new BigDecimal("1.5")) < 0 || currentOdds.compareTo(new BigDecimal("5.0")) > 0) {
			throw new IllegalStateException("目前賠率超出允許範圍 (1.5 - 5.0)，無法下單");
		}

		BigDecimal shares = amount.divide(currentOdds, 8, RoundingMode.HALF_UP);
		Trade trade = new Trade(
				userId,
				request.marketId(),
				request.side(),
				TradeAction.BUY,
				amount,
				currentOdds,
				shares
		);
		Trade savedTrade = tradeRepository.save(trade);
		String idemKey = "TRADE_BUY_" + savedTrade.getId();
		walletService.debit(userId, amount, "TRADE", savedTrade.getId(), idemKey);
		positionService.addBuyPosition(userId, request.marketId(), request.side(), shares, amount);

		market.buy(request.side(), amount);
		marketRepository.save(market);

		return savedTrade;
	}
}
