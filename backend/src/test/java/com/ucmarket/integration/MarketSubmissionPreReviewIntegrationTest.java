package com.ucmarket.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketReviewCheck.CheckStatus;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.exception.MarketPreReviewBlockedException;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewCheckRepository;
import com.ucmarket.service.MarketPreReviewService;
import com.ucmarket.service.MarketService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class MarketSubmissionPreReviewIntegrationTest {

    private static final UUID DRAFT_MARKET_ID =
            UUID.fromString("00000000-0000-4003-8000-000000000003");
    private static final UUID CREATOR_ID =
            UUID.fromString("00000000-0000-4000-8000-000000000006");

    @Autowired
    private MarketService marketService;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private MarketReviewCheckRepository checkRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoSpyBean
    private MarketPreReviewService preReviewService;

    @BeforeEach
    void setUpMarket() {
        jdbc.update("""
                UPDATE markets
                SET title = 'Draft market',
                    description = 'Complete description',
                    category = 'CURRENT_AFFAIRS',
                    market_type = 'BINARY',
                    source_url = 'https://example.com/source',
                    resolution_rule = 'Official result determines YES or NO',
                    close_at = '2026-09-30 23:59:59',
                    status = 'DRAFT',
                    submission_version = 0
                WHERE id = ?
                """, DRAFT_MARKET_ID);
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM market_review_checks WHERE market_id = ?", DRAFT_MARKET_ID);
        jdbc.update("""
                DELETE FROM notification_job_attempts
                WHERE job_id IN (
                    SELECT id FROM notification_jobs WHERE market_id = ?
                )
                """, DRAFT_MARKET_ID);
        jdbc.update("DELETE FROM notification_jobs WHERE market_id = ?", DRAFT_MARKET_ID);
        jdbc.update("""
                UPDATE markets
                SET title = 'Draft market',
                    description = 'Draft market',
                    category = 'TECH',
                    market_type = 'BINARY',
                    source_url = NULL,
                    resolution_rule = NULL,
                    close_at = '2026-09-30 23:59:59',
                    status = 'DRAFT',
                    submission_version = 0
                WHERE id = ?
                """, DRAFT_MARKET_ID);
    }

    @Test
    void submitMarket_validInput_persistsPassingChecksForSubmissionVersion() {
        Market submitted = marketService.submitMarket(DRAFT_MARKET_ID, CREATOR_ID);

        var checks = checkRepository
                .findByMarketIdAndSubmissionVersionOrderByRuleCode(DRAFT_MARKET_ID, 1);

        assertEquals(MarketStatus.PENDING, submitted.getStatus());
        assertEquals(5, checks.size());
        assertTrue(checks.stream().allMatch(check -> check.getStatus() == CheckStatus.PASS));
    }

    @Test
    void submitMarket_blockedInput_keepsDraftAndPersistsReasons() {
        jdbc.update("UPDATE markets SET description = NULL WHERE id = ?", DRAFT_MARKET_ID);

        assertThrows(MarketPreReviewBlockedException.class,
                () -> marketService.submitMarket(DRAFT_MARKET_ID, CREATOR_ID));

        Market reloaded = marketRepository.findById(DRAFT_MARKET_ID).orElseThrow();
        var checks = checkRepository
                .findByMarketIdAndSubmissionVersionOrderByRuleCode(DRAFT_MARKET_ID, 1);

        assertEquals(MarketStatus.DRAFT, reloaded.getStatus());
        assertEquals(0, reloaded.getSubmissionVersion());
        assertTrue(checks.stream().anyMatch(check ->
                check.getRuleCode().equals("REQUIRED_FIELDS")
                        && check.getStatus() == CheckStatus.BLOCKED));
    }

    @Test
    void submitMarket_preReviewException_keepsDraftAndLeavesNoChecks() {
        doThrow(new RuntimeException("simulated pre-review failure"))
                .when(preReviewService).reviewForSubmission(any(Market.class));

        assertThrows(RuntimeException.class,
                () -> marketService.submitMarket(DRAFT_MARKET_ID, CREATOR_ID));

        Market reloaded = marketRepository.findById(DRAFT_MARKET_ID).orElseThrow();
        assertEquals(MarketStatus.DRAFT, reloaded.getStatus());
        assertEquals(0, reloaded.getSubmissionVersion());
        assertEquals(0, checkRepository
                .findByMarketIdAndSubmissionVersionOrderByRuleCode(DRAFT_MARKET_ID, 1)
                .size());
    }
}
