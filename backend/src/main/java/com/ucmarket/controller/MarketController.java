package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;
import com.ucmarket.entity.MarketStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

    private final MarketRepository marketRepository;

    public MarketController(MarketRepository marketRepository) {
        this.marketRepository = marketRepository;
    }

    @GetMapping
    public List<Market> listMarkets() {
        return marketRepository.findAll();
    }

    @GetMapping("/{id}")
    public Market getMarket(@PathVariable UUID id) {
        return marketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "找不到市場"
                ));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Market createMarket(
            @Valid @RequestBody CreateMarketRequest request
    ) {
        Market market = new Market(
                request.title(),
                request.description(),
                request.category(),
                request.sourceUrl(),
                request.resolutionRule(),
                request.closeAt()
        );

        return marketRepository.save(market);
    }
    @PostMapping("/{id}/activate")
public Market activateMarket(
        @PathVariable UUID id
) {
    Market market = marketRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND
            ));

    market.setStatus(MarketStatus.ACTIVE);

    return marketRepository.save(market);
}
}