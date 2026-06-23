package com.ucmarket.service;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.entity.Wallet;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.entity.WalletTransactionType;
import com.ucmarket.exception.InsufficientFundsException;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.repository.WalletRepository;
import com.ucmarket.repository.WalletTransactionRepository;

import jakarta.transaction.Transactional;

@Service
public class TradeService {
	private final MarketRepository marketRepository;
	private final TradeRepository tradeRepository;
	private final WalletRepository walletRepository;
	private final WalletTransactionRepository walletTransactionRepository;
	private final TradeQuoteService tradeQuoteService;

	public TradeService(MarketRepository marketRepository, TradeRepository tradeRepository,
			WalletRepository walletRepository, WalletTransactionRepository walletTransactionRepository,
			TradeQuoteService tradeQuoteService) {
		this.marketRepository = marketRepository;
		this.tradeRepository = tradeRepository;
		this.walletRepository = walletRepository;
		this.walletTransactionRepository = walletTransactionRepository;
		this.tradeQuoteService = tradeQuoteService;
	}

	@Transactional
	public Trade placeTrade(UUID userId, TradeRequest request) {

		BigDecimal amount = request.amount();
		Wallet wallet = walletRepository.findByUserId(userId).orElseThrow(() -> new RuntimeException("找不到錢包"));

		Market market = marketRepository.findById(request.marketId()).orElseThrow(() -> new RuntimeException("市場不存在"));
		
		if (wallet.getBalance().compareTo(amount) < 0) {
			throw new InsufficientFundsException(userId, amount, wallet.getBalance());
		}
		wallet.applyDebit(amount);
		walletRepository.save(wallet);

		BigDecimal currentOdds = tradeQuoteService.getMarketOdds(market, request.side());
		if (currentOdds.compareTo(new BigDecimal("1.5")) < 0 || currentOdds.compareTo(new BigDecimal("5.0")) > 0) {
			throw new IllegalStateException("目前賠率超出允許範圍 (1.5 - 5.0)，無法下單");
		}


		if (MarketSide.YES.equals(request.side())) {
			market.setYesPool(market.getYesPool().add(amount));
		} else {
			market.setNoPool(market.getNoPool().add(amount));
		}
		marketRepository.save(market);

		Trade trade = new Trade(userId, request.marketId(), request.side(), TradeAction.BUY, amount, BigDecimal.ONE,
				amount);
		Trade savedTrade = tradeRepository.save(trade);

		WalletTransaction transaction = new WalletTransaction(wallet.getId(), userId, WalletTransactionType.TRADE_BUY,
				amount.negate(), wallet.getBalance(), "TRADE", savedTrade.getId(), UUID.randomUUID().toString());
		walletTransactionRepository.save(transaction);

		return savedTrade;
	}
}
//	private final MarketRepository marketRepository;
//    private final TradeRepository tradeRepository;
//
//    public TradeService(MarketRepository marketRepository, TradeRepository tradeRepository) {
//        this.marketRepository = marketRepository;
//        this.tradeRepository = tradeRepository;
//    }
//
//    @Transactional
//    public Trade executeTrade(UUID userId, UUID marketId, MarketSide side, BigDecimal amount) {
//
//        Market market = marketRepository.findById(marketId)
//            .orElseThrow(() -> new IllegalArgumentException("市場不存在"));
//
//        if (market.getStatus() != MarketStatus.ACTIVE) {
//            throw new IllegalStateException("該市場目前無法下單");
//        }
//
//        market.buy(side, amount);
//        marketRepository.save(market);
//
//        BigDecimal price = BigDecimal.ONE;
//        BigDecimal shares = amount.divide(price); 
//        
//        Trade trade = new Trade(userId, marketId, side, TradeAction.BUY, amount, price, shares);
//        return tradeRepository.save(trade);
//    }

// --------------------------------------------
