package com.ucmarket.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class NotificationJobRepositoryClaimTest {

    @Autowired
    private NotificationJobRepository repository;

    @Test
    void claimIfAvailable_onlyFirstWorkerSucceeds() {
        NotificationJob job = repository.saveAndFlush(new NotificationJob(
                NotificationEventType.MARKET_SUBMITTED,
                UUID.randomUUID(),
                "owner@example.com",
                UUID.randomUUID(),
                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                "claim-test-" + UUID.randomUUID()));

        LocalDateTime now = LocalDateTime.now();

        int firstClaim = repository.claimIfAvailable(job.getId(), now, "worker-a");
        int secondClaim = repository.claimIfAvailable(job.getId(), now, "worker-b");

        assertEquals(1, firstClaim);
        assertEquals(0, secondClaim);

        NotificationJob claimed = repository.findById(job.getId()).orElseThrow();
        assertEquals(NotificationJobStatus.PROCESSING, claimed.getStatus());
        assertEquals("worker-a", claimed.getLockedBy());
    }
}