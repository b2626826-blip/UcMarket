package com.ucmarket.service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketReviewCheck;
import com.ucmarket.entity.MarketReviewCheck.CheckStatus;
import com.ucmarket.repository.MarketReviewCheckRepository;

@Service
public class MarketPreReviewService {

    private static final int RULE_VERSION = 1;

    private final MarketReviewCheckRepository checkRepository;

    public MarketPreReviewService(MarketReviewCheckRepository checkRepository) {
        this.checkRepository = checkRepository;
    }

    @Transactional
    public MarketPreReviewResult reviewForSubmission(Market market) {
        int submissionVersion = market.getSubmissionVersion() + 1;
        LocalDateTime now = LocalDateTime.now();

        List<MarketReviewCheck> checks = List.of(
                check(
                        market,
                        submissionVersion,
                        "REQUIRED_FIELDS",
                        hasRequiredFields(market),
                        "All required fields are present.",
                        "Title, description, category, market type, source URL, resolution rule, and close time are required.",
                        now),
                check(
                        market,
                        submissionVersion,
                        "CLOSE_AT_FUTURE",
                        market.getCloseAt() != null && market.getCloseAt().isAfter(now),
                        "Close time is in the future.",
                        "Close time must be later than the review time.",
                        now),
                check(
                        market,
                        submissionVersion,
                        "SOURCE_URL_HTTP",
                        isHttpUrl(market.getSourceUrl()),
                        "Source URL uses HTTP(S).",
                        "Source URL must be an absolute HTTP(S) URL.",
                        now),
                check(
                        market,
                        submissionVersion,
                        "FIELD_LENGTHS",
                        hasValidDatabaseLengths(market),
                        "Database-backed field lengths are within limits.",
                        "Title, category, or market type exceeds its database length limit.",
                        now),
                check(
                        market,
                        submissionVersion,
                        "MARKET_TYPE_OPTIONS",
                        "BINARY".equals(market.getMarketType()),
                        "BINARY market uses the supported YES/NO options.",
                        "Only BINARY markets with YES/NO options are currently supported.",
                        now));

        checkRepository.deleteByMarketIdAndSubmissionVersion(
                market.getId(), submissionVersion);
        checkRepository.saveAll(checks);

        List<String> blockingRuleCodes = checks.stream()
                .filter(check -> check.getStatus() == CheckStatus.BLOCKED)
                .map(MarketReviewCheck::getRuleCode)
                .toList();

        return new MarketPreReviewResult(checks, blockingRuleCodes);
    }

    private MarketReviewCheck check(
            Market market,
            int submissionVersion,
            String ruleCode,
            boolean passed,
            String passReason,
            String blockedReason,
            LocalDateTime executedAt) {
        return new MarketReviewCheck(
                market.getId(),
                submissionVersion,
                ruleCode,
                RULE_VERSION,
                passed ? CheckStatus.PASS : CheckStatus.BLOCKED,
                passed ? passReason : blockedReason,
                executedAt);
    }

    private boolean hasRequiredFields(Market market) {
        return hasText(market.getTitle())
                && hasText(market.getDescription())
                && hasText(market.getCategory())
                && hasText(market.getMarketType())
                && hasText(market.getSourceUrl())
                && hasText(market.getResolutionRule())
                && market.getCloseAt() != null;
    }

    private boolean hasValidDatabaseLengths(Market market) {
        return withinLength(market.getTitle(), 255)
                && withinLength(market.getCategory(), 64)
                && withinLength(market.getMarketType(), 32);
    }

    private boolean isHttpUrl(String value) {
        if (!hasText(value)) {
            return false;
        }
        try {
            URI uri = URI.create(value);
            return ("http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null
                    && !uri.getHost().isBlank();
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean withinLength(String value, int maxLength) {
        return value == null || value.codePointCount(0, value.length()) <= maxLength;
    }
}
