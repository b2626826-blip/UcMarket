package com.ucmarket.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;

import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;

@Service
public class TradeQuoteService {
	public TradeQuoteResponse getQuote(Market market, MarketSide side, BigDecimal amount) {
		BigDecimal yesPool = market.getYesPool();
        BigDecimal noPool = market.getNoPool();
        BigDecimal totalPool = yesPool.add(noPool);
        
        // 1. 計算下注後的 Pool (模擬交易)
        BigDecimal newYesPool;
        BigDecimal newNoPool;
        BigDecimal k = yesPool.multiply(noPool);
        
        if (side == MarketSide.YES) {
            newNoPool = noPool.add(amount);
            newYesPool = k.divide(newNoPool, 18, RoundingMode.HALF_UP);
        } else {
            newYesPool = yesPool.add(amount);
            newNoPool = k.divide(newYesPool, 18, RoundingMode.HALF_UP);
        }
        
        BigDecimal newTotal = newYesPool.add(newNoPool);
        BigDecimal odds = (side == MarketSide.YES) 
            ? newTotal.divide(newYesPool, 4, RoundingMode.HALF_UP)
            : newTotal.divide(newNoPool, 4, RoundingMode.HALF_UP);
            
        return new TradeQuoteResponse(odds, amount);
	}
	
	public BigDecimal getMarketOdds(Market market, MarketSide side) {
        BigDecimal yesPool = market.getYesPool();
        BigDecimal noPool = market.getNoPool();
        BigDecimal totalPool = yesPool.add(noPool);
        
        // 賠率公式：總資金池 / 該選項資金池
        // 避免除以零，雖然系統初始化通常會確保池子有 100
        if (side == MarketSide.YES) {
            return totalPool.divide(yesPool, 4, RoundingMode.HALF_UP);
        } else {
            return totalPool.divide(noPool, 4, RoundingMode.HALF_UP);
        }
    }
}
