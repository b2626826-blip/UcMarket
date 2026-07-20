package com.ucmarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketReviewCheck;
import com.ucmarket.entity.MarketReviewCheck.CheckStatus;
import com.ucmarket.repository.MarketReviewCheckRepository;

@ExtendWith(MockitoExtension.class)
class MarketPreReviewServiceTest {

    @Mock
    private MarketReviewCheckRepository checkRepository;

    private MarketPreReviewService service;

    @BeforeEach
    void setUp() {
        service = new MarketPreReviewService(checkRepository);
    }

    @Test
    void review_validMarket_allRulesPassAndPersistForNextSubmission() {
        Market market = validMarket();

        MarketPreReviewResult result = service.reviewForSubmission(market);

        assertEquals(5, result.checks().size());
        assertTrue(result.checks().stream()
                .allMatch(check -> check.getStatus() == CheckStatus.PASS));
        assertTrue(result.blockingRuleCodes().isEmpty());
        verify(checkRepository).deleteByMarketIdAndSubmissionVersion(market.getId(), 1);
        verify(checkRepository).saveAll(anyList());
    }

    @Test
    void review_missingRequiredField_blocksRequiredFieldsRule() {
        Market market = validMarket();
        market.setDescription(" ");

        assertBlocked(market, "REQUIRED_FIELDS");
    }

    @Test
    void review_pastCloseAt_blocksCloseAtRule() {
        Market market = validMarket();
        market.setCloseAt(LocalDateTime.now().minusMinutes(1));

        assertBlocked(market, "CLOSE_AT_FUTURE");
    }

    @Test
    void review_nonHttpSourceUrl_blocksSourceUrlRule() {
        Market market = validMarket();
        market.setSourceUrl("ftp://example.com/result");

        assertBlocked(market, "SOURCE_URL_HTTP");
    }

    @Test
    void review_fieldLengthUsesDatabaseBoundaries() {
        Market valid = validMarket();
        valid.setTitle("a".repeat(255));
        assertEquals(CheckStatus.PASS, byRule(service.reviewForSubmission(valid))
                .get("FIELD_LENGTHS").getStatus());

        Market tooLong = validMarket();
        tooLong.setTitle("a".repeat(256));
        assertBlocked(tooLong, "FIELD_LENGTHS");
    }

    @Test
    void review_fieldLengthCountsUnicodeCodePointsLikePostgres() {
        Market market = validMarket();
        market.setTitle("😀".repeat(128));

        assertEquals(CheckStatus.PASS, byRule(service.reviewForSubmission(market))
                .get("FIELD_LENGTHS").getStatus());
    }

    @Test
    void review_nonBinaryMarketType_blocksCompatibilityRule() {
        Market market = validMarket();
        market.setMarketType("MULTIPLE_CHOICE");

        assertBlocked(market, "MARKET_TYPE_OPTIONS");
    }

    @Test
    void review_sameInputTwice_hasSameStatusesAndReasons() {
        Market market = validMarket();

        Map<String, String> first = comparable(service.reviewForSubmission(market));
        Map<String, String> second = comparable(service.reviewForSubmission(market));

        assertEquals(first, second);
    }

    private void assertBlocked(Market market, String ruleCode) {
        MarketReviewCheck check = byRule(service.reviewForSubmission(market)).get(ruleCode);

        assertEquals(CheckStatus.BLOCKED, check.getStatus());
        assertTrue(check.getReason() != null && !check.getReason().isBlank());
    }

    private Map<String, MarketReviewCheck> byRule(MarketPreReviewResult result) {
        return result.checks().stream()
                .collect(Collectors.toMap(MarketReviewCheck::getRuleCode, Function.identity()));
    }

    private Map<String, String> comparable(MarketPreReviewResult result) {
        return result.checks().stream().collect(Collectors.toMap(
                MarketReviewCheck::getRuleCode,
                check -> check.getStatus() + ":" + check.getReason()));
    }

    private Market validMarket() {
        Market market = new Market(
                "Will the event happen?",
                "A complete market description",
                "CURRENT_AFFAIRS",
                "BINARY",
                "https://example.com/source",
                "Resolve YES when the official source confirms the event.",
                LocalDateTime.now().plusDays(7));
        ReflectionTestUtils.setField(market, "id", UUID.randomUUID());
        return market;
    }
}
