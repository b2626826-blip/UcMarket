package com.ucmarket.automation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.ucmarket.notification.EmailTemplateService;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJob;
import com.ucmarket.notification.NotificationJobAttempt;
import com.ucmarket.notification.NotificationJobAttemptRepository;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.notification.NotificationJobStatus;
import com.ucmarket.notification.RecordingEmailSender;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
                NotificationJobWorker.class,
                EmailTemplateService.class,
                RecordingEmailSender.class,
                JacksonAutoConfiguration.class
})
@TestPropertySource(properties = {
                "notification.worker.enabled=true",
                "notification.worker.batch-size=10",
                "notification.worker.max-attempts=4",
                "notification.worker.lease-timeout-minutes=10"
})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class NotificationJobWorkerIntegrationTest {

        @Autowired
        private NotificationJobWorker worker;

        @Autowired
        private NotificationJobRepository jobRepository;

        @Autowired
        private NotificationJobAttemptRepository attemptRepository;

        @Autowired
        private RecordingEmailSender emailSender;

        @Autowired
        private PlatformTransactionManager transactionManager;

        @Autowired
        private EmailTemplateService templateService;

        @Test
        void processOnce_success_marksSentAndRecordsAttempt() {
                NotificationJob job = jobRepository.saveAndFlush(new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                UUID.randomUUID(),
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-success-" + UUID.randomUUID()));

                int sentBefore = emailSender.sentEmails().size();
                worker.processOnce();

                NotificationJob completed = jobRepository.findById(job.getId()).orElseThrow();
                List<NotificationJobAttempt> attempts = attemptRepository.findByJobIdOrderByAttemptNoAsc(job.getId());

                assertEquals(NotificationJobStatus.SENT, completed.getStatus());
                assertEquals(1, completed.getAttemptCount());
                assertEquals(sentBefore + 1, emailSender.sentEmails().size());
                assertEquals(
                                "owner@example.com",
                                emailSender.sentEmails().get(sentBefore).recipientEmail());
                assertEquals(1, attempts.size());
                assertEquals(1, attempts.get(0).getAttemptNo());
                assertEquals("SENT", attempts.get(0).getStatus());
                assertFalse(
                                emailSender.sentEmails().get(sentBefore).transactionActive());
        }

        @Test
        void processOnce_firstFailure_marksRetryAfterOneMinute() {
                emailSender.failNextSend(new RuntimeException("temporary failure"));

                NotificationJob job = jobRepository.saveAndFlush(new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                UUID.randomUUID(),
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-retry-" + UUID.randomUUID()));

                LocalDateTime before = LocalDateTime.now();

                worker.processOnce();

                LocalDateTime after = LocalDateTime.now();
                NotificationJob retried = jobRepository.findById(job.getId()).orElseThrow();
                List<NotificationJobAttempt> attempts = attemptRepository.findByJobIdOrderByAttemptNoAsc(job.getId());

                assertEquals(NotificationJobStatus.RETRY, retried.getStatus());
                assertEquals(1, retried.getAttemptCount());
                assertEquals("temporary failure", retried.getLastError());
                assertFalse(retried.getNextAttemptAt().isBefore(before.plusMinutes(1)));
                assertFalse(retried.getNextAttemptAt().isAfter(after.plusMinutes(1)));

                assertEquals(1, attempts.size());
                assertEquals(1, attempts.get(0).getAttemptNo());
                assertEquals("RETRY", attempts.get(0).getStatus());
                assertEquals("temporary failure", attempts.get(0).getErrorMessage());
        }

        @Test
        void processOnce_longFailureMessage_truncatesAttemptError() {
                String longError = "x".repeat(1001);
                emailSender.failNextSend(new RuntimeException(longError));

                NotificationJob job = jobRepository.saveAndFlush(new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                UUID.randomUUID(),
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-long-error-" + UUID.randomUUID()));

                worker.processOnce();

                NotificationJob retried = jobRepository.findById(job.getId()).orElseThrow();
                List<NotificationJobAttempt> attempts = attemptRepository.findByJobIdOrderByAttemptNoAsc(job.getId());

                assertEquals(NotificationJobStatus.RETRY, retried.getStatus());
                assertEquals(1000, retried.getLastError().length());
                assertEquals(1, attempts.size());
                assertEquals(1000, attempts.get(0).getErrorMessage().length());
        }

        @Test
        void processOnce_secondFailure_marksRetryAfterFiveMinutes() {
                NotificationJob job = new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                UUID.randomUUID(),
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-retry-five-" + UUID.randomUUID());

                job.markRetry(
                                LocalDateTime.now().minusSeconds(1),
                                "first failure");

                job = jobRepository.saveAndFlush(job);
                emailSender.failNextSend(new RuntimeException("second failure"));

                LocalDateTime before = LocalDateTime.now();

                worker.processOnce();

                LocalDateTime after = LocalDateTime.now();
                NotificationJob retried = jobRepository.findById(job.getId()).orElseThrow();
                List<NotificationJobAttempt> attempts = attemptRepository.findByJobIdOrderByAttemptNoAsc(job.getId());

                assertEquals(NotificationJobStatus.RETRY, retried.getStatus());
                assertEquals(2, retried.getAttemptCount());
                assertFalse(retried.getNextAttemptAt().isBefore(before.plusMinutes(5)));
                assertFalse(retried.getNextAttemptAt().isAfter(after.plusMinutes(5)));

                assertEquals(1, attempts.size());
                assertEquals(2, attempts.get(0).getAttemptNo());
                assertEquals("RETRY", attempts.get(0).getStatus());
                assertEquals("second failure", attempts.get(0).getErrorMessage());
        }

        @Test
        void processOnce_thirdFailure_marksRetryAfterThirtyMinutes() {
                NotificationJob job = new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                UUID.randomUUID(),
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-retry-thirty-" + UUID.randomUUID());

                job.markRetry(LocalDateTime.now().minusSeconds(1), "first failure");
                job.markRetry(LocalDateTime.now().minusSeconds(1), "second failure");

                job = jobRepository.saveAndFlush(job);
                emailSender.failNextSend(new RuntimeException("third failure"));

                LocalDateTime before = LocalDateTime.now();

                worker.processOnce();

                LocalDateTime after = LocalDateTime.now();
                NotificationJob retried = jobRepository.findById(job.getId()).orElseThrow();
                List<NotificationJobAttempt> attempts = attemptRepository.findByJobIdOrderByAttemptNoAsc(job.getId());

                assertEquals(NotificationJobStatus.RETRY, retried.getStatus());
                assertEquals(3, retried.getAttemptCount());
                assertFalse(retried.getNextAttemptAt().isBefore(before.plusMinutes(30)));
                assertFalse(retried.getNextAttemptAt().isAfter(after.plusMinutes(30)));

                assertEquals(1, attempts.size());
                assertEquals(3, attempts.get(0).getAttemptNo());
                assertEquals("RETRY", attempts.get(0).getStatus());
                assertEquals("third failure", attempts.get(0).getErrorMessage());
        }

        @Test
        void processOnce_maxAttemptsReached_marksFailedWithoutRecursiveJob() {
                UUID marketId = UUID.randomUUID();

                NotificationJob job = new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                marketId,
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-failed-" + UUID.randomUUID());

                job.markRetry(LocalDateTime.now().minusSeconds(1), "first failure");
                job.markRetry(LocalDateTime.now().minusSeconds(1), "second failure");
                job.markRetry(LocalDateTime.now().minusSeconds(1), "third failure");

                job = jobRepository.saveAndFlush(job);
                emailSender.failNextSend(new RuntimeException("fourth failure"));

                worker.processOnce();

                NotificationJob failed = jobRepository.findById(job.getId()).orElseThrow();
                List<NotificationJobAttempt> attempts = attemptRepository.findByJobIdOrderByAttemptNoAsc(job.getId());

                assertEquals(NotificationJobStatus.FAILED, failed.getStatus());
                assertEquals(4, failed.getAttemptCount());
                assertEquals("fourth failure", failed.getLastError());

                assertEquals(1, attempts.size());
                assertEquals(4, attempts.get(0).getAttemptNo());
                assertEquals("FAILED", attempts.get(0).getStatus());
                assertEquals("fourth failure", attempts.get(0).getErrorMessage());

                assertEquals(
                                1,
                                jobRepository.findByMarketIdAndEventType(
                                                marketId,
                                                NotificationEventType.MARKET_SUBMITTED).size());
        }

        @Test
        void processOnce_reclaimsTimedOutProcessingJob() {
                NotificationJob job = jobRepository.saveAndFlush(new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                UUID.randomUUID(),
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-reclaim-" + UUID.randomUUID()));

                LocalDateTime expiredLock = LocalDateTime.now().minusMinutes(11);

                TransactionTemplate setupTransaction = new TransactionTemplate(transactionManager);

                setupTransaction.executeWithoutResult(status -> assertEquals(
                                1,
                                jobRepository.claimIfAvailable(
                                                job.getId(),
                                                expiredLock,
                                                "dead-worker")));

                int sentBefore = emailSender.sentEmails().size();

                worker.processOnce();

                NotificationJob completed = jobRepository.findById(job.getId()).orElseThrow();

                assertEquals(NotificationJobStatus.SENT, completed.getStatus());
                assertEquals(sentBefore + 1, emailSender.sentEmails().size());
                assertEquals(
                                1,
                                attemptRepository
                                                .findByJobIdOrderByAttemptNoAsc(job.getId())
                                                .size());
        }

        @Test
        void processOnce_twoWorkers_sendJobOnlyOnce() throws Exception {
                NotificationJob secondWorkerJob = jobRepository.saveAndFlush(new NotificationJob(
                                NotificationEventType.MARKET_SUBMITTED,
                                UUID.randomUUID(),
                                "owner@example.com",
                                UUID.randomUUID(),
                                "{\"marketTitle\":\"Will it rain tomorrow?\"}",
                                "worker-race-" + UUID.randomUUID()));

                NotificationJobWorker secondWorker = new NotificationJobWorker(
                                jobRepository,
                                attemptRepository,
                                templateService,
                                emailSender,
                                transactionManager,
                                10,
                                4,
                                10);

                int sentBefore = emailSender.sentEmails().size();
                CountDownLatch start = new CountDownLatch(1);
                ExecutorService executor = Executors.newFixedThreadPool(2);

                try {
                        Future<?> first = executor.submit(() -> {
                                start.await();
                                worker.processOnce();
                                return null;
                        });

                        Future<?> second = executor.submit(() -> {
                                start.await();
                                secondWorker.processOnce();
                                return null;
                        });

                        start.countDown();
                        first.get();
                        second.get();
                } finally {
                        executor.shutdownNow();
                }

                NotificationJob completed = jobRepository.findById(secondWorkerJob.getId()).orElseThrow();

                assertEquals(NotificationJobStatus.SENT, completed.getStatus());
                assertEquals(sentBefore + 1, emailSender.sentEmails().size());
                assertEquals(
                                1,
                                attemptRepository
                                                .findByJobIdOrderByAttemptNoAsc(secondWorkerJob.getId())
                                                .size());
        }
}
