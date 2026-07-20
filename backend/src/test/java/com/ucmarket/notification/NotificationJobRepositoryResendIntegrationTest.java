package com.ucmarket.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class NotificationJobRepositoryResendIntegrationTest {

    @Autowired
    private NotificationJobRepository jobRepository;

    @Autowired
    private NotificationJobAttemptRepository attemptRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void resetForResend_failedJobMovesToRetryAndPreservesHistory() {
        NotificationJob job = newJob("resend-failed-");
        job.markRetry(LocalDateTime.now().minusMinutes(5), "temporary failure");
        job.markFailed("final failure");
        job = jobRepository.saveAndFlush(job);

        LocalDateTime attemptStartedAt = LocalDateTime.now().minusMinutes(1);
        NotificationJobAttempt attempt = attemptRepository.saveAndFlush(new NotificationJobAttempt(
                job.getId(),
                job.getAttemptCount(),
                "FAILED",
                job.getLastError(),
                attemptStartedAt,
                attemptStartedAt.plusSeconds(1)));

        LocalDateTime lockedAt = LocalDateTime.now().minusMinutes(2).withNano(123_000_000);
        jdbcTemplate.update(
                "update notification_jobs set locked_at = ?, locked_by = ? where id = ?",
                Timestamp.valueOf(lockedAt),
                "dead-worker",
                job.getId());

        int originalAttemptCount = job.getAttemptCount();
        String originalLastError = job.getLastError();
        LocalDateTime resendAt = LocalDateTime.now().withNano(456_000_000);

        int updated = jobRepository.resetForResend(job.getId(), resendAt);

        NotificationJob reset = jobRepository.findById(job.getId()).orElseThrow();
        List<NotificationJobAttempt> attempts =
                attemptRepository.findByJobIdOrderByAttemptNoAsc(job.getId());

        assertEquals(1, updated);
        assertEquals(NotificationJobStatus.RETRY, reset.getStatus());
        assertEquals(resendAt, reset.getNextAttemptAt());
        assertNull(reset.getLockedAt());
        assertNull(reset.getLockedBy());
        assertEquals(originalAttemptCount, reset.getAttemptCount());
        assertEquals(originalLastError, reset.getLastError());
        assertEquals(1, attempts.size());
        assertEquals(attempt.getId(), attempts.get(0).getId());
        assertEquals("FAILED", attempts.get(0).getStatus());
        assertEquals(originalLastError, attempts.get(0).getErrorMessage());
    }

    @ParameterizedTest
    @EnumSource(
            value = NotificationJobStatus.class,
            names = {"PENDING", "PROCESSING", "RETRY", "SENT"})
    void resetForResend_nonFailedJobIsUnchanged(NotificationJobStatus status) {
        NotificationJob job = jobRepository.saveAndFlush(newJob("resend-" + status.name().toLowerCase() + "-"));
        LocalDateTime originalNextAttemptAt = LocalDateTime.now().plusHours(1).withNano(123_000_000);
        LocalDateTime originalLockedAt = LocalDateTime.now().minusMinutes(1).withNano(456_000_000);

        jdbcTemplate.update(
                """
                update notification_jobs
                set status = ?,
                    attempt_count = ?,
                    next_attempt_at = ?,
                    locked_at = ?,
                    locked_by = ?,
                    last_error = ?
                where id = ?
                """,
                status.name(),
                3,
                Timestamp.valueOf(originalNextAttemptAt),
                Timestamp.valueOf(originalLockedAt),
                "existing-worker",
                "existing error",
                job.getId());

        int updated = jobRepository.resetForResend(
                job.getId(),
                LocalDateTime.now().withNano(789_000_000));

        NotificationJob unchanged = jobRepository.findById(job.getId()).orElseThrow();

        assertEquals(0, updated);
        assertEquals(status, unchanged.getStatus());
        assertEquals(originalNextAttemptAt, unchanged.getNextAttemptAt());
        assertEquals(originalLockedAt, unchanged.getLockedAt());
        assertEquals("existing-worker", unchanged.getLockedBy());
        assertEquals(3, unchanged.getAttemptCount());
        assertEquals("existing error", unchanged.getLastError());
    }

    private NotificationJob newJob(String idempotencyKeyPrefix) {
        return new NotificationJob(
                NotificationEventType.MARKET_SUBMITTED,
                UUID.randomUUID(),
                "owner@example.com",
                UUID.randomUUID(),
                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                idempotencyKeyPrefix + UUID.randomUUID());
    }
}
