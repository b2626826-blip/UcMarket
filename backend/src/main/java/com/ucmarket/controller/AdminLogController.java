package com.ucmarket.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.PageResponse;
import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.User;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.util.PageParams;

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
    public PageResponse<AdminLog> listLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AdminLog> result = adminLogRepository.search(
                action, keyword, PageParams.of(page, size, "createdAt"));
        fillCodes(result.getContent());
        return PageResponse.of(result);
    }

    private void fillCodes(List<AdminLog> logs) {
        Set<UUID> userIds = logs.stream()
                .flatMap(l -> {
                    java.util.stream.Stream.Builder<UUID> b = java.util.stream.Stream.builder();
                    if (l.getAdminUserId() != null) b.add(l.getAdminUserId());
                    if (l.getTargetId() != null && "USER".equals(l.getTargetType())) b.add(l.getTargetId());
                    return b.build();
                })
                .collect(Collectors.toSet());
        Set<UUID> marketIds = logs.stream()
                .filter(l -> l.getTargetId() != null && "MARKET".equals(l.getTargetType()))
                .map(AdminLog::getTargetId)
                .collect(Collectors.toSet());

        Map<UUID, String> userCodeMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getCode() != null ? u.getCode() : ""));
        Map<UUID, String> marketCodeMap = marketRepository.findAllById(marketIds).stream()
                .collect(Collectors.toMap(Market::getId, m -> m.getCode() != null ? m.getCode() : ""));

        for (AdminLog log : logs) {
            if (log.getAdminUserId() != null) {
                log.setAdminCode(userCodeMap.get(log.getAdminUserId()));
            }
            if (log.getTargetId() != null && log.getTargetType() != null) {
                if ("MARKET".equals(log.getTargetType())) {
                    log.setTargetCode(marketCodeMap.get(log.getTargetId()));
                } else if ("USER".equals(log.getTargetType())) {
                    log.setTargetCode(userCodeMap.get(log.getTargetId()));
                } else {
                    log.setTargetCode(log.getTargetId().toString().substring(0, 8));
                }
            }
        }
    }
}
