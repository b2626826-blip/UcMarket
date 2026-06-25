package com.ucmarket.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

import jakarta.transaction.Transactional;

@Service
public class TradeService {
	private final MarketRepository marketRepository;
	private final TradeRepository tradeRepository;

	private final TradeQuoteService tradeQuoteService;
	private final WalletService walletService;

	public TradeService(MarketRepository marketRepository, TradeRepository tradeRepository,
			TradeQuoteService tradeQuoteService,WalletService walletService) {
		this.marketRepository = marketRepository;
		this.tradeRepository = tradeRepository;

		this.tradeQuoteService = tradeQuoteService;
		this.walletService = walletService;
	}

	@Transactional
	public Trade placeTrade(UUID userId, TradeRequest request) {
		Market market = marketRepository.findById(request.marketId()).orElseThrow(() -> new RuntimeException("市場不存在"));
		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new IllegalStateException("該市場目前無法下單");
		}
		BigDecimal amount = request.amount();
		BigDecimal currentOdds = tradeQuoteService.getMarketOdds(market, request.side());
		if (currentOdds.compareTo(new BigDecimal("1.5")) < 0 || currentOdds.compareTo(new BigDecimal("5.0")) > 0) {
			throw new IllegalStateException("目前賠率超出允許範圍 (1.5 - 5.0)，無法下單");
		}
		BigDecimal shares = amount.divide(
		        currentOdds,
		        8,
		        RoundingMode.HALF_UP
		);
		

	
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
		walletService.debit(
				userId,
				amount,
				"TRADE",
				savedTrade.getId(),
				idemKey
				
		);

		if (MarketSide.YES.equals(request.side())) {
			market.setYesPool(market.getYesPool().add(amount));
		} else {
			market.setNoPool(market.getNoPool().add(amount));
		}
		marketRepository.save(market);


		return savedTrade;
	}
	
	// 單純負責前端使用者試算價格
	public TradeQuoteResponse getQuote(TradeRequest request) {

	    Market market = marketRepository.findById(request.marketId())
	            .orElseThrow(() -> new RuntimeException("市場不存在"));

	    return tradeQuoteService.getQuote(
	            market,
	            request.side(),
	            request.amount()
	    );
	}
}

