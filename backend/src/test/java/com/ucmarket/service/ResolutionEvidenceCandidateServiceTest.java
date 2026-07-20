package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@ExtendWith(MockitoExtension.class)
class ResolutionEvidenceCandidateServiceTest {

    @Mock private MarketRepository marketRepository;

    private ResolutionEvidenceCandidateService service;

    @BeforeEach
    void setUp() {
        service = new ResolutionEvidenceCandidateService(marketRepository);
    }

    @Test
    void findCandidates_mapsDedicatedDtoAndUsesBoundedStablePagination() {
        UUID marketId = UUID.randomUUID();
        LocalDateTime closeAt = LocalDateTime.of(2026, 7, 20, 12, 0);
        Market market = new Market(
                "Candidate title",
                "Description",
                "CURRENT_AFFAIRS",
                "https://example.com/source",
                "Resolve according to source",
                closeAt);
        ReflectionTestUtils.setField(market, "id", marketId);
        ReflectionTestUtils.setField(market, "status", MarketStatus.CLOSED);
        when(marketRepository.findResolutionEvidenceCandidates(
                        org.mockito.ArgumentMatchers.eq(MarketStatus.CLOSED),
                        org.mockito.ArgumentMatchers.eq("CURRENT_AFFAIRS"),
                        org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(market)));

        var result = service.findCandidates(-3, 999);

        assertThat(result.getContent()).containsExactly(
                new com.ucmarket.dto.ResolutionEvidenceCandidateResponse(
                        marketId,
                        "Candidate title",
                        "https://example.com/source",
                        "Resolve according to source",
                        closeAt));

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(marketRepository).findResolutionEvidenceCandidates(
                org.mockito.ArgumentMatchers.eq(MarketStatus.CLOSED),
                org.mockito.ArgumentMatchers.eq("CURRENT_AFFAIRS"),
                pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(50);
        assertThat(pageable.getSort().getOrderFor("closeAt").getDirection().isAscending()).isTrue();
        assertThat(pageable.getSort().getOrderFor("id").getDirection().isAscending()).isTrue();
    }

    @Test
    void findCandidates_clampsSizeToAtLeastOne() {
        when(marketRepository.findResolutionEvidenceCandidates(
                        org.mockito.ArgumentMatchers.eq(MarketStatus.CLOSED),
                        org.mockito.ArgumentMatchers.eq("CURRENT_AFFAIRS"),
                        org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(Page.empty());

        service.findCandidates(0, 0);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(marketRepository).findResolutionEvidenceCandidates(
                org.mockito.ArgumentMatchers.eq(MarketStatus.CLOSED),
                org.mockito.ArgumentMatchers.eq("CURRENT_AFFAIRS"),
                pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isOne();
    }
}
