package com.ucmarket.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.PageResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.util.PageParams;

@RestController
@RequestMapping("/api/admin/transactions")
public class AdminTransactionController {

    private final TradeRepository tradeRepository;
    private final UserRepository userRepository;
    private final MarketRepository marketRepository;

    public AdminTransactionController(TradeRepository tradeRepository,
            UserRepository userRepository, MarketRepository marketRepository) {
        this.tradeRepository = tradeRepository;
        this.userRepository = userRepository;
        this.marketRepository = marketRepository;
    }

    @GetMapping
    public PageResponse<Trade> listTransactions(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String side,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        TradeAction actionEnum = parseAction(action);
        MarketSide sideEnum = parseSide(side);

        Page<Trade> result = tradeRepository.search(
                actionEnum, sideEnum, keyword, PageParams.of(page, size, "createdAt"));
        fillCodes(result.getContent());
        return PageResponse.of(result);
    }

    private void fillCodes(List<Trade> trades) {
        Map<UUID, String> userCache = new HashMap<>();
        Map<UUID, String> marketCache = new HashMap<>();
        for (Trade tx : trades) {
            if (tx.getUserId() != null) {
                String code = userCache.computeIfAbsent(tx.getUserId(),
                        id -> userRepository.findById(id).map(User::getCode).orElse(null));
                tx.setUserCode(code);
            }
            if (tx.getMarketId() != null) {
                String code = marketCache.computeIfAbsent(tx.getMarketId(),
                        id -> marketRepository.findById(id).map(Market::getCode).orElse(null));
                tx.setMarketCode(code);
            }
        }
    }

    private static TradeAction parseAction(String action) {
        if (action == null || action.isBlank()) return null;
        return TradeAction.valueOf(action.toUpperCase());
    }

    private static MarketSide parseSide(String side) {
        if (side == null || side.isBlank()) return null;
        return MarketSide.valueOf(side.toUpperCase());
    }
}
