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
    private final WalletRepository walletRepository; // 記得補上
    private final WalletTransactionRepository walletTransactionRepository; // 記得補上

    // 建構子注入必須包含所有需要的 Repository
    public TradeService(MarketRepository marketRepository, TradeRepository tradeRepository,
                        WalletRepository walletRepository, WalletTransactionRepository walletTransactionRepository) {
        this.marketRepository = marketRepository;
        this.tradeRepository = tradeRepository;
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
    }

    @Transactional
    public Trade placeTrade(UUID userId, TradeRequest request) {
    	BigDecimal amount = request.amount();
        // 1. 取得 Wallet 並扣款
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("找不到錢包"));
        
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(userId, amount, wallet.getBalance());
        }
        wallet.applyDebit(amount);
        walletRepository.save(wallet);

        // 2. 更新 Market
        Market market = marketRepository.findById(request.marketId())
                .orElseThrow(() -> new RuntimeException("市場不存在"));
        
        // 假設 Market 內有邏輯處理 Pool
        if (MarketSide.YES.equals(request.side())) {
            market.setYesPool(market.getYesPool().add(amount));
        } else {
            market.setNoPool(market.getNoPool().add(amount));
        }
        marketRepository.save(market);

        // 3. 建立並儲存 Trade
        Trade trade = new Trade(userId, request.marketId(),request.side(), 
                                TradeAction.BUY, amount, BigDecimal.ONE, amount);
        Trade savedTrade = tradeRepository.save(trade);

        // 4. 寫入 WalletTransaction (現在傳入 savedTrade.getId())
        WalletTransaction transaction = new WalletTransaction(
                wallet.getId(), userId, WalletTransactionType.TRADE_BUY,
                amount.negate(), wallet.getBalance(), "TRADE",
                savedTrade.getId(), UUID.randomUUID().toString()
        );
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
    
    //--------------------------------------------
   

