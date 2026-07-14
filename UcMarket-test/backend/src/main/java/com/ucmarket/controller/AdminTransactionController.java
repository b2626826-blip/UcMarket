package com.ucmarket.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.repository.UserRepository;

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
    public List<Trade> listTransactions() {
        List<Trade> trades = tradeRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        fillCodes(trades);
        return trades;
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
}
