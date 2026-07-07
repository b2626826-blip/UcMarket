package com.ucmarket.service;

import com.ucmarket.dto.admin.MarketSummaryItem;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceTest {

    @Mock private MarketRepository marketRepository;

    private AdminDashboardService service;

    @BeforeEach
    void setUp() {
        service = new AdminDashboardService(marketRepository);
    }

    @Test
    void getMarketSummary_shouldReturnFourItems() {
        when(marketRepository.count()).thenReturn(100L);
        when(marketRepository.countByStatus(MarketStatus.PENDING)).thenReturn(10L);
        when(marketRepository.countByStatus(MarketStatus.ACTIVE)).thenReturn(30L);
        when(marketRepository.countByStatus(MarketStatus.RESOLVED)).thenReturn(50L);

        List<MarketSummaryItem> summary = service.getMarketSummary();

        assertEquals(4, summary.size());
        assertEquals("全部事件", summary.get(0).label());
        assertEquals(100, summary.get(0).value());
        assertEquals("待審核", summary.get(1).label());
        assertEquals(10, summary.get(1).value());
        assertEquals("進行中", summary.get(2).label());
        assertEquals(30, summary.get(2).value());
        assertEquals("已結算", summary.get(3).label());
        assertEquals(50, summary.get(3).value());
    }
}
