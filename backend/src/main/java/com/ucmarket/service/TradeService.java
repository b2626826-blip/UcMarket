package com.ucmarket.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

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

        positionService.addBuyPosition(
                userId,
                marketId,
                request.side(),
                shares,
                request.amount()
        );

        market.buy(request.side(), request.amount());
        marketRepository.save(market);

        return new TradeQuoteResponse(
                request.side(),
                request.amount(),
                price,
                shares
        );
    }

    private Market findActiveMarket(UUID marketId) {
        return marketRepository.findById(marketId)
                .filter(market -> market.getStatus() == MarketStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Market is not active"
                ));
    }

    private BigDecimal calculateBinaryPrice(Market market, MarketSide side) {
        if (side == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Side is required");
        }

        BigDecimal totalPool = market.getYesPool().add(market.getNoPool());

        if (totalPool.compareTo(BigDecimal.ZERO) == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Market pool must be greater than zero"
            );
        }

        BigDecimal sidePool = side == MarketSide.YES
                ? market.getNoPool()
                : market.getYesPool();

        return sidePool.divide(totalPool, 4, RoundingMode.HALF_UP);
    }
}