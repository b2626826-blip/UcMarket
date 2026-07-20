package com.ucmarket.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import com.ucmarket.entity.MarketStatus;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ResolutionEvidenceCandidateRepositoryTest {

    @Autowired private MarketRepository marketRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void findResolutionEvidenceCandidates_filtersEvidenceAndUsesStableOrderAndPageLimit() {
        UUID creatorId = UUID.randomUUID();
        LocalDateTime firstCloseAt = LocalDateTime.of(2026, 7, 20, 10, 0);
        LocalDateTime secondCloseAt = LocalDateTime.of(2026, 7, 20, 11, 0);
        UUID firstId = UUID.fromString("00000000-0000-4000-8000-000000000001");
        UUID secondId = UUID.fromString("00000000-0000-4000-8000-000000000002");
        UUID thirdId = UUID.fromString("00000000-0000-4000-8000-000000000003");
        UUID withEvidenceId = UUID.randomUUID();
        UUID activeId = UUID.randomUUID();
        UUID sportsId = UUID.randomUUID();

        insertMarket(firstId, creatorId, "First", "CURRENT_AFFAIRS", "CLOSED", firstCloseAt);
        insertMarket(secondId, creatorId, "Second", "CURRENT_AFFAIRS", "CLOSED", firstCloseAt);
        insertMarket(thirdId, creatorId, "Third", "CURRENT_AFFAIRS", "CLOSED", secondCloseAt);
        insertMarket(
                withEvidenceId, creatorId, "Has evidence", "CURRENT_AFFAIRS", "CLOSED", firstCloseAt);
        insertMarket(activeId, creatorId, "Active", "CURRENT_AFFAIRS", "ACTIVE", firstCloseAt);
        insertMarket(sportsId, creatorId, "Sports", "SPORTS", "CLOSED", firstCloseAt);
        insertEvidence(withEvidenceId);

        Sort stableSort = Sort.by(
                Sort.Order.asc("closeAt"),
                Sort.Order.asc("id"));
        var firstPage = marketRepository.findResolutionEvidenceCandidates(
                MarketStatus.CLOSED,
                "CURRENT_AFFAIRS",
                PageRequest.of(0, 2, stableSort));
        var secondPage = marketRepository.findResolutionEvidenceCandidates(
                MarketStatus.CLOSED,
                "CURRENT_AFFAIRS",
                PageRequest.of(1, 2, stableSort));

        assertThat(firstPage.getContent())
                .extracting(market -> market.getId())
                .containsExactly(firstId, secondId);
        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(secondPage.getContent())
                .extracting(market -> market.getId())
                .containsExactly(thirdId);
    }

    private void insertMarket(
            UUID id,
            UUID creatorId,
            String title,
            String category,
            String status,
            LocalDateTime closeAt) {
        jdbcTemplate.update("""
                INSERT INTO markets (
                    id, creator_id, title, category, source_url, resolution_rule,
                    close_at, status, market_type, yes_pool, no_pool,
                    submission_version, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BINARY', 100.00, 100.00, 0, ?, ?)
                """,
                id,
                creatorId,
                title,
                category,
                "https://example.com/" + id,
                "Resolution rule " + id,
                Timestamp.valueOf(closeAt),
                status,
                Timestamp.valueOf(closeAt.minusDays(1)),
                Timestamp.valueOf(closeAt.minusDays(1)));
    }

    private void insertEvidence(UUID marketId) {
        jdbcTemplate.update("""
                INSERT INTO market_resolution_evidence (
                    id, market_id, source_url, source_title, fetched_at, created_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                UUID.randomUUID(),
                marketId,
                "https://example.com/evidence",
                "Existing evidence");
    }
}
