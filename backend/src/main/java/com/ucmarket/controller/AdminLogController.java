package com.ucmarket.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.User;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;

@RestController
@RequestMapping("/api/admin/logs")
public class AdminLogController {

    private final AdminLogRepository adminLogRepository;
    private final UserRepository userRepository;
    private final MarketRepository marketRepository;

    public AdminLogController(AdminLogRepository adminLogRepository,
            UserRepository userRepository, MarketRepository marketRepository) {
        this.adminLogRepository = adminLogRepository;
        this.userRepository = userRepository;
        this.marketRepository = marketRepository;
    }

    @GetMapping
    public List<AdminLog> listLogs() {
        List<AdminLog> logs = adminLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        fillCodes(logs);
        return logs;
    }

    private void fillCodes(List<AdminLog> logs) {
        Map<UUID, String> userCache = new HashMap<>();
        Map<UUID, String> marketCache = new HashMap<>();
        for (AdminLog log : logs) {
            if (log.getAdminUserId() != null) {
                String code = userCache.computeIfAbsent(log.getAdminUserId(),
                        id -> userRepository.findById(id).map(User::getCode).orElse(null));
                log.setAdminCode(code);
            }
            if (log.getTargetId() != null && log.getTargetType() != null) {
                UUID targetId = log.getTargetId();
                String code;
                if ("MARKET".equals(log.getTargetType())) {
                    code = marketCache.computeIfAbsent(targetId,
                            id -> marketRepository.findById(id).map(Market::getCode).orElse(null));
                } else if ("USER".equals(log.getTargetType())) {
                    code = userCache.computeIfAbsent(targetId,
                            id -> userRepository.findById(id).map(User::getCode).orElse(null));
                } else {
                    code = targetId.toString().substring(0, 8);
                }
                log.setTargetCode(code);
            }
        }
    }
}
