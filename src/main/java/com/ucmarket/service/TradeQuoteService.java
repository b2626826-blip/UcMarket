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
	    // 1. 計算原始賠率
	    BigDecimal rawOdds;
	    if (side == MarketSide.YES) {
	        rawOdds = totalPool.divide(yesPool, 4, RoundingMode.HALF_UP);
	    } else {
	        rawOdds = totalPool.divide(noPool, 4, RoundingMode.HALF_UP);
	    }
	    // 2. 設定限制範圍
	    BigDecimal minOdds = new BigDecimal("1.5");
	    BigDecimal maxOdds = new BigDecimal("5.0");
	    // 3. 執行截斷邏輯 (Clamping)
	    if (rawOdds.compareTo(maxOdds) > 0) {
	        return maxOdds;
	    }
	    if (rawOdds.compareTo(minOdds) < 0) {
	        return minOdds;
	    }
	    return rawOdds;
	}
}
