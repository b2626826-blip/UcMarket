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
		BigDecimal odds = getMarketOdds(market, side);
		BigDecimal shares = amount.divide(odds, 8, RoundingMode.HALF_UP);
		return new TradeQuoteResponse(odds, amount, shares);
	}

	public BigDecimal getMarketOdds(Market market, MarketSide side) {
		BigDecimal yesPool = market.getYesPool();
		BigDecimal noPool = market.getNoPool();
		BigDecimal totalPool = yesPool.add(noPool);

		BigDecimal rawOdds;
		if (side == MarketSide.YES) {
			rawOdds = totalPool.divide(yesPool, 4, RoundingMode.HALF_UP);
		} else {
			rawOdds = totalPool.divide(noPool, 4, RoundingMode.HALF_UP);
		}

		return OddsRules.clamp(rawOdds);
	}
}
