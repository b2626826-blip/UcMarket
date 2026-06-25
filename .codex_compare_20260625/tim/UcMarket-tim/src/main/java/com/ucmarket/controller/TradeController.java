package com.ucmarket.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.User;
import com.ucmarket.service.TradeService;

import jakarta.validation.Valid;

//@RestController
//@RequestMapping("/api/markets")
//public class TradeController {
//
//	private final MarketRepository marketRepository;
//	private final TradeRepository tradeRepository;
//
//	public TradeController(MarketRepository marketRepository, TradeRepository tradeRepository) {
//		this.marketRepository = marketRepository;
//		this.tradeRepository = tradeRepository;
//	}
//
	//	@PostMapping("/{id}/trades/quote")
	//	public TradeQuoteResponse quoteTrade(@PathVariable UUID id, @Valid @RequestBody TradeQuoteRequest request) {
	//		Market market = marketRepository.findById(id)
	//				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	//
	//		if (market.getStatus() != MarketStatus.ACTIVE) {
	//			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
	//		}
	//
	//		return buildQuote(market, request);
	//	}
//
//	@PostMapping("/{id}/trades")
//	@ResponseStatus(HttpStatus.CREATED)
//	public TradeQuoteResponse executeTrade(@PathVariable UUID id, @AuthenticationPrincipal User user,
//			@Valid @RequestBody TradeQuoteRequest request) {
//		Market market = marketRepository.findById(id)
//				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
//
//		if (market.getStatus() != MarketStatus.ACTIVE) {
//			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
//		}
//
//		TradeQuoteResponse quote = buildQuote(market, request);
//		BigDecimal shares = request.amount().divide(quote.price(), 4, RoundingMode.HALF_UP);
//
//		market.buy(request.side(), request.amount());
//		marketRepository.save(market);
//
//		Trade trade = new Trade(
//				user.getId(),
//				id,
//				request.side(),
//				TradeAction.BUY,
//				request.amount(),
//				quote.price(),
//				shares
//		);
//		tradeRepository.save(trade);
//
//		return quote;
//	}
//
//	private TradeQuoteResponse buildQuote(Market market, TradeQuoteRequest request) {
//		BigDecimal totalPool = market.getYesPool().add(market.getNoPool());
//		BigDecimal sidePool = request.side() == MarketSide.YES
//				? market.getNoPool()
//				: market.getYesPool();
//
//		BigDecimal price = sidePool.divide(totalPool, 4, RoundingMode.HALF_UP);
//		BigDecimal estimatedCost = request.amount().multiply(price);
//
//		return new TradeQuoteResponse(
//				request.side(),
//				request.amount(),
//				price,
//				estimatedCost
//		);
//	}
//}

@RestController
@RequestMapping("/api/trades")
public class TradeController {
    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @PostMapping
    public ResponseEntity<Trade> placeTrade(
            @AuthenticationPrincipal User user, 
            @Valid @RequestBody TradeRequest request) { 
    	
        
        Trade trade = tradeService.placeTrade(user.getId(), request);
        return ResponseEntity.ok(trade);
    }
}
