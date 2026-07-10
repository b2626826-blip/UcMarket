package com.ucmarket.integration;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("pgtest")
@Transactional
class MarketRepositoryIntegrationTest {

    @Autowired
    private MarketRepository marketRepository;

    private static final UUID MARKET_RAIN_ID = UUID.fromString("00000000-0000-4003-8000-000000000001");
    private static final UUID MARKET_BTC_ID = UUID.fromString("00000000-0000-4003-8000-000000000006");
    private static final UUID MARKET_APPLE_ID = UUID.fromString("00000000-0000-4003-8000-000000000003");

    @Test
    void mockData_rainMarket_shouldBeActive() {
        Market m = marketRepository.findById(MARKET_RAIN_ID).orElse(null);
        assertNotNull(m, "Rain market should exist (load mock.sql first)");
        assertEquals(MarketStatus.ACTIVE, m.getStatus());
        assertEquals("BINARY", m.getMarketType());
        assertEquals("WEATHER", m.getCategory());
        assertNotNull(m.getApprovedAt());
        assertNotNull(m.getApprovedBy());
        assertNull(m.getResolvedAt());
        assertEquals(0, new BigDecimal("1680.00").compareTo(m.getYesPool()));
        assertEquals(0, new BigDecimal("1320.00").compareTo(m.getNoPool()));
    }

    @Test
    void mockData_btcMarket_shouldBeResolvedNo() {
        Market m = marketRepository.findById(MARKET_BTC_ID).orElse(null);
        assertNotNull(m);
        assertEquals(MarketStatus.RESOLVED, m.getStatus());
        assertEquals(MarketResult.NO, m.getResult());
        assertNotNull(m.getApprovedAt());
        assertNotNull(m.getResolvedAt());
        assertNotNull(m.getResolvedBy());
    }

    @Test
    void mockData_appleMarket_shouldBeDraft() {
        Market m = marketRepository.findById(MARKET_APPLE_ID).orElse(null);
        assertNotNull(m);
        assertEquals(MarketStatus.DRAFT, m.getStatus());
        assertNull(m.getApprovedAt());
        assertNull(m.getResult());
    }

    @Test
    void findByStatus_shouldFindActiveMarkets() {
        List<Market> actives = marketRepository.findByStatus(MarketStatus.ACTIVE);
        assertFalse(actives.isEmpty(), "There should be ACTIVE markets from mock data");
        for (Market m : actives) {
            assertEquals(MarketStatus.ACTIVE, m.getStatus());
        }
    }

    @Test
    void findByStatus_shouldFindPendingMarkets() {
        List<Market> pendings = marketRepository.findByStatus(MarketStatus.PENDING);
        assertFalse(pendings.isEmpty());
        assertEquals(MarketStatus.PENDING, pendings.get(0).getStatus());
    }

    @Test
    void findByStatus_shouldFindResolvedMarkets() {
        List<Market> resolved = marketRepository.findByStatus(MarketStatus.RESOLVED);
        assertFalse(resolved.isEmpty());
        assertEquals(MarketStatus.RESOLVED, resolved.get(0).getStatus());
        assertNotNull(resolved.get(0).getResult());
    }

    @Test
    void countByStatus_shouldMatchMockData() {
        long draftCount = marketRepository.countByStatus(MarketStatus.DRAFT);
        assertTrue(draftCount >= 1, "At least 1 DRAFT market expected");

        long activeCount = marketRepository.countByStatus(MarketStatus.ACTIVE);
        assertTrue(activeCount >= 3, "At least 3 ACTIVE markets expected");

        long total = marketRepository.count();
        assertEquals(draftCount + activeCount +
                marketRepository.countByStatus(MarketStatus.PENDING) +
                marketRepository.countByStatus(MarketStatus.RESOLVED) +
                marketRepository.countByStatus(MarketStatus.REJECTED) +
                marketRepository.countByStatus(MarketStatus.CLOSED) +
                marketRepository.countByStatus(MarketStatus.CANCELED), total);
    }
}
