package com.ucmarket.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.exception.IdempotencyConflictException;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

@Service
public class TradeService {

	private final MarketRepository marketRepository;
	private final TradeRepository tradeRepository;
	private final TradeQuoteService tradeQuoteService;
	private final WalletService walletService;
	private final PositionService positionService;
	private final PriceHistoryService priceHistoryService;

	public TradeService(MarketRepository marketRepository, TradeRepository tradeRepository,
			TradeQuoteService tradeQuoteService, WalletService walletService, PositionService positionService,
			PriceHistoryService priceHistoryService) {
		this.marketRepository = marketRepository;
		this.tradeRepository = tradeRepository;
		this.tradeQuoteService = tradeQuoteService;
		this.walletService = walletService;
		this.positionService = positionService;
		this.priceHistoryService = priceHistoryService;
	}

	@Transactional
	public Trade placeTrade(UUID userId, TradeRequest request, String idempotencyKey) {
		requireIdempotencyKey(idempotencyKey);
		Trade existingTrade = tradeRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
		if (existingTrade != null) {
			return verifyExistingTrade(existingTrade, userId, request, idempotencyKey);
		}

		Market market = marketRepository.findByIdForUpdate(request.marketId())
				.orElseThrow(() -> new RuntimeException("Market not found"));
		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new IllegalStateException("Market is not active");
		}

		BigDecimal amount = request.amount();
		BigDecimal currentOdds = tradeQuoteService.getMarketOdds(market, request.side());
		if (!OddsRules.isWithinRange(currentOdds)) {
			throw new IllegalStateException("Trade odds are outside the allowed range");
		}

		BigDecimal shares = amount.divide(currentOdds, 8, RoundingMode.HALF_UP);
		Trade trade = new Trade(
				userId,
				request.marketId(),
				request.side(),
				TradeAction.BUY,
				amount,
				currentOdds,
				shares,
				idempotencyKey
		);

		Trade savedTrade;
		try {
			savedTrade = tradeRepository.saveAndFlush(trade);
		} catch (DataIntegrityViolationException ex) {
			Trade retryTrade = tradeRepository.findByIdempotencyKey(idempotencyKey)
					.orElseThrow(() -> ex);
			return verifyExistingTrade(retryTrade, userId, request, idempotencyKey);
		}

		walletService.debit(userId, amount, "TRADE", savedTrade.getId(), idempotencyKey);
		positionService.addBuyPosition(userId, request.marketId(), request.side(), shares, amount);

		market.buy(request.side(), amount);
		marketRepository.save(market);

		BigDecimal totalPool = market.getYesPool().add(market.getNoPool());
		BigDecimal yesPrice = totalPool.compareTo(BigDecimal.ZERO) > 0
				? market.getYesPool().divide(totalPool, 4, RoundingMode.HALF_UP)
				: new BigDecimal("0.5000");
		BigDecimal noPrice = totalPool.compareTo(BigDecimal.ZERO) > 0
				? market.getNoPool().divide(totalPool, 4, RoundingMode.HALF_UP)
				: new BigDecimal("0.5000");
		priceHistoryService.record(market.getId(), yesPrice, noPrice, amount);

		return savedTrade;
	}

	private void requireIdempotencyKey(String idempotencyKey) {
		if (idempotencyKey == null || idempotencyKey.isBlank()) {
			throw new IllegalArgumentException("Missing Idempotency-Key header");
		}
	}

	private Trade verifyExistingTrade(Trade trade, UUID userId, TradeRequest request, String idempotencyKey) {
		if (!trade.getUserId().equals(userId)
				|| !trade.getMarketId().equals(request.marketId())
				|| trade.getSide() != request.side()
				|| trade.getAction() != TradeAction.BUY
				|| trade.getAmount().compareTo(request.amount()) != 0) {
			throw new IdempotencyConflictException(idempotencyKey);
		}
		return trade;
	}
}
