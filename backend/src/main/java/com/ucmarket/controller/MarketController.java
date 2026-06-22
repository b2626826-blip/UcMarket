package com.ucmarket.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.dto.UpdateMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.service.WalletService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

    private final MarketRepository marketRepository;
    private final PositionRepository positionRepository;
    private final TradeRepository tradeRepository;
    private final WalletService walletService;

    public MarketController(MarketRepository marketRepository,
            PositionRepository positionRepository,
            TradeRepository tradeRepository,
            WalletService walletService) {
        this.marketRepository = marketRepository;
        this.positionRepository = positionRepository;
        this.tradeRepository = tradeRepository;
        this.walletService = walletService;
    }

    @GetMapping
    public List<Market> listMarkets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return marketRepository.findAll(pageable).getContent();
    }

    @GetMapping("/code/{code}")
    public Market getMarketByCode(@PathVariable String code) {
        return marketRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Market not found: " + code));
    }

    @GetMapping("/{id}")
    public Market getMarket(@PathVariable UUID id) {
        return marketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Market not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Market createMarket(@AuthenticationPrincipal User user, @Valid @RequestBody CreateMarketRequest request) {
        Market market = new Market(request.title(), request.description(), request.category(), request.marketType(),
                request.sourceUrl(), request.resolutionRule(), request.closeAt());
        market.setCreatorId(user.getId());

        return marketRepository.save(market);
    }

    @PostMapping("/{id}/submit")
    public Market submitMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        Market market = marketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!market.getCreatorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (market.getStatus() != MarketStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT markets can be submitted");
        }

        market.changeStatus(MarketStatus.PENDING);
        return marketRepository.save(market);
    }

    @PutMapping("/{id}")
    public Market updateMarket(@PathVariable UUID id, @AuthenticationPrincipal User user,
            @RequestBody UpdateMarketRequest request) {
        Market market = marketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!market.getCreatorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (market.getStatus() != MarketStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT markets can be edited");
        }

        if (request.title() != null) market.setTitle(request.title());
        if (request.description() != null) market.setDescription(request.description());
        if (request.category() != null) market.setCategory(request.category());
        if (request.marketType() != null) market.setMarketType(request.marketType());
        if (request.sourceUrl() != null) market.setSourceUrl(request.sourceUrl());
        if (request.resolutionRule() != null) market.setResolutionRule(request.resolutionRule());
        if (request.closeAt() != null) market.setCloseAt(request.closeAt());

        return marketRepository.save(market);
    }

    @PostMapping("/{id}/cancel")
    public Market cancelMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        Market market = marketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!market.getCreatorId().equals(user.getId())
                && user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        market.cancel();
        marketRepository.save(market);

        refundPositions(market);

        return market;
    }

    private void refundPositions(Market market) {
        List<Position> positions = positionRepository.findByMarketIdAndStatus(market.getId(), PositionStatus.OPEN);
        for (Position pos : positions) {
            BigDecimal refundAmount = pos.getYesCost().add(pos.getNoCost());
            if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
                String idemKey = "cancel:" + market.getId() + ":" + pos.getId();
                walletService.credit(pos.getUserId(), refundAmount, "MARKET", market.getId(), idemKey);
            }
            pos.cancel();
        }
    }

	@PostMapping("/{id}/trades/quote")
	public TradeQuoteResponse quoteTrade(@PathVariable UUID id, @Valid @RequestBody TradeQuoteRequest request) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}

		return buildQuote(market, request);
	}

	@PostMapping("/{id}/trades")
	@ResponseStatus(HttpStatus.CREATED)
	public TradeQuoteResponse createTrade(@PathVariable UUID id, @AuthenticationPrincipal User user,
			@Valid @RequestBody TradeQuoteRequest request) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}

		TradeQuoteResponse quote = buildQuote(market, request);
		BigDecimal shares = request.amount().divide(quote.price(), 4, RoundingMode.HALF_UP);

		market.buy(request.side(), request.amount());
		marketRepository.save(market);

		Trade trade = new Trade(user.getId(), id, request.side(), TradeAction.BUY,
				request.amount(), quote.price(), shares);
		tradeRepository.save(trade);

		return quote;
	}

	private TradeQuoteResponse buildQuote(Market market, TradeQuoteRequest request) {
		BigDecimal totalPool = market.getYesPool().add(market.getNoPool());
		BigDecimal sidePool = request.side() == MarketSide.YES
				? market.getNoPool()
				: market.getYesPool();
		BigDecimal price = sidePool.divide(totalPool, 4, RoundingMode.HALF_UP);
		BigDecimal estimatedCost = request.amount().multiply(price);

		return new TradeQuoteResponse(request.side(), request.amount(), price, estimatedCost);
	}
}
