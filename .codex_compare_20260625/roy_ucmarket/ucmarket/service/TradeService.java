package com.ucmarket.service;

import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class TradeService {

    private final MarketRepository marketRepository;
    private final TradeRepository tradeRepository;
    private final PositionService positionService;

    public TradeService(
            MarketRepository marketRepository,
            TradeRepository tradeRepository,
            PositionService positionService
    ) {
        this.marketRepository = marketRepository;
        this.tradeRepository = tradeRepository;
        this.positionService = positionService;
    }

    public TradeQuoteResponse quoteBinaryTrade(
            UUID marketId,
            TradeQuoteRequest request
    ) {
        Market market = findActiveMarket(marketId);

        BigDecimal price = calculateBinaryPrice(market, request.side());
        BigDecimal shares = request.amount()
                .divide(price, 4, RoundingMode.HALF_UP);

        return new TradeQuoteResponse(
                request.side(),
                request.amount(),
                price,
                shares
        );
    }

    @Transactional
    public TradeQuoteResponse buyBinaryTrade(
            UUID userId,
            UUID marketId,
            TradeQuoteRequest request
    ) {
        Market market = findActiveMarket(marketId);

        BigDecimal price = calculateBinaryPrice(market, request.side());
        BigDecimal shares = request.amount()
                .divide(price, 4, RoundingMode.HALF_UP);

        // 1. 更新市場池子
        market.buy(request.side(), request.amount());
        marketRepository.save(market);

        // 2. 建立交易紀錄
        Trade trade = new Trade(
                userId,
                marketId,
                null,
                request.side(),
                TradeAction.BUY,
                request.amount(),
                price,
                shares
        );

        tradeRepository.save(trade);

        // 3. 更新持倉
        positionService.addBuyPosition(
                userId,
                marketId,
                request.side(),
                shares,
                request.amount()
        );

        return new TradeQuoteResponse(
                request.side(),
                request.amount(),
                price,
                shares
        );
    }

    private Market findActiveMarket(UUID marketId) {
        Market market = marketRepository.findById(marketId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "找不到市場"
                ));

        // 如果你的 MarketStatus 是 OPEN，就用 OPEN
        if (market.getStatus() != MarketStatus.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "市場目前不是開放交易狀態"
            );
        }

        return market;
    }

    private BigDecimal calculateBinaryPrice(Market market, MarketSide side) {
        BigDecimal totalPool = market.getYesPool().add(market.getNoPool());

        if (totalPool.compareTo(BigDecimal.ZERO) == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "市場資金池不能為 0"
            );
        }

        BigDecimal sidePool = side == MarketSide.YES
                ? market.getNoPool()
                : market.getYesPool();

        return sidePool.divide(totalPool, 4, RoundingMode.HALF_UP);
    }
}