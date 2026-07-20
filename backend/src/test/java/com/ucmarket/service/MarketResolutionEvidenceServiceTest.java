package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.ResolutionEvidenceRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResolutionEvidence;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketResolutionEvidenceRepository;

@ExtendWith(MockitoExtension.class)
class MarketResolutionEvidenceServiceTest {

    @Mock private MarketRepository marketRepository;
    @Mock private MarketResolutionEvidenceRepository evidenceRepository;

    private MarketResolutionEvidenceService service;

    @BeforeEach
    void setUp() {
        service = new MarketResolutionEvidenceService(marketRepository, evidenceRepository);
    }

    @Test
    void save_closedCurrentAffairsMarket_persistsObjectiveSource() {
        UUID marketId = UUID.randomUUID();
        Market market = market(marketId, "CURRENT_AFFAIRS", MarketStatus.CLOSED);
        ResolutionEvidenceRequest request = new ResolutionEvidenceRequest(
                "https://example.com/news/1", "Objective report", Instant.parse("2026-07-20T01:00:00Z"));

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(evidenceRepository.findByMarketIdAndSourceUrl(marketId, request.sourceUrl()))
                .thenReturn(Optional.empty());
        when(evidenceRepository.save(org.mockito.ArgumentMatchers.any(MarketResolutionEvidence.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.save(marketId, request);

        assertThat(response.marketId()).isEqualTo(marketId);
        assertThat(response.sourceUrl()).isEqualTo(request.sourceUrl());
        assertThat(response.sourceTitle()).isEqualTo(request.sourceTitle());
        assertThat(response.publishedAt()).isEqualTo(request.publishedAt());
        assertThat(response.fetchedAt()).isNotNull();
        assertThat(response.createdAt()).isNotNull();
        verify(evidenceRepository).save(org.mockito.ArgumentMatchers.any(MarketResolutionEvidence.class));
    }

    @Test
    void save_sameMarketAndSourceUrl_returnsExistingWithoutDuplicateInsert() {
        UUID marketId = UUID.randomUUID();
        Market market = market(marketId, "CURRENT_AFFAIRS", MarketStatus.CLOSED);
        ResolutionEvidenceRequest request = new ResolutionEvidenceRequest(
                "https://example.com/news/1", "Objective report", null);
        MarketResolutionEvidence existing = new MarketResolutionEvidence(
                marketId, request.sourceUrl(), request.sourceTitle(), null);

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(evidenceRepository.findByMarketIdAndSourceUrl(marketId, request.sourceUrl()))
                .thenReturn(Optional.of(existing));

        var response = service.save(marketId, request);

        assertThat(response.sourceUrl()).isEqualTo(request.sourceUrl());
        verify(evidenceRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void save_activeMarket_isRejected() {
        UUID marketId = UUID.randomUUID();
        when(marketRepository.findById(marketId))
                .thenReturn(Optional.of(market(marketId, "CURRENT_AFFAIRS", MarketStatus.ACTIVE)));

        assertThatThrownBy(() -> service.save(marketId, request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not ready for resolution evidence");
        verify(evidenceRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void save_nonCurrentAffairsMarket_isRejected() {
        UUID marketId = UUID.randomUUID();
        when(marketRepository.findById(marketId))
                .thenReturn(Optional.of(market(marketId, "SPORTS", MarketStatus.CLOSED)));

        assertThatThrownBy(() -> service.save(marketId, request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("CURRENT_AFFAIRS");
        verify(evidenceRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void list_returnsDedicatedResponseDtos() {
        UUID marketId = UUID.randomUUID();
        MarketResolutionEvidence evidence = new MarketResolutionEvidence(
                marketId, "https://example.com/news/1", "Objective report", null);
        when(marketRepository.existsById(marketId)).thenReturn(true);
        when(evidenceRepository.findByMarketIdOrderByCreatedAtAsc(marketId)).thenReturn(List.of(evidence));

        var responses = service.list(marketId);

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().marketId()).isEqualTo(marketId);
    }

    private static ResolutionEvidenceRequest request() {
        return new ResolutionEvidenceRequest("https://example.com/news/1", "Objective report", null);
    }

    private static Market market(UUID id, String category, MarketStatus status) {
        Market market = new Market(
                "Title", "Description", category, null, null, null, LocalDateTime.now().minusHours(1));
        ReflectionTestUtils.setField(market, "id", id);
        ReflectionTestUtils.setField(market, "status", status);
        return market;
    }
}
