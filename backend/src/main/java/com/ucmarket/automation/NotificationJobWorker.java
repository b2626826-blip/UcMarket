package com.ucmarket.automation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.ucmarket.notification.EmailSender;
import com.ucmarket.notification.EmailTemplateService;
import com.ucmarket.notification.EmailTemplateService.EmailContent;
import com.ucmarket.notification.NotificationJob;
import com.ucmarket.notification.NotificationJobAttempt;
import com.ucmarket.notification.NotificationJobAttemptRepository;
import com.ucmarket.notification.NotificationJobRepository;

@Component
@ConditionalOnProperty(prefix = "notification.worker", name = "enabled", havingValue = "true")
public class NotificationJobWorker {

    private final NotificationJobRepository jobRepository;
    private final NotificationJobAttemptRepository attemptRepository;
    private final EmailTemplateService templateService;
    private final EmailSender emailSender;
    private final TransactionTemplate transactionTemplate;
    private final int batchSize;
    private final int maxAttempts;
    private final long leaseTimeoutMinutes;
    private final String workerId = UUID.randomUUID().toString();

    public NotificationJobWorker(
            NotificationJobRepository jobRepository,
            NotificationJobAttemptRepository attemptRepository,
            EmailTemplateService templateService,
            EmailSender emailSender,
            PlatformTransactionManager transactionManager,
            @Value("${notification.worker.batch-size}") int batchSize,
            @Value("${notification.worker.max-attempts}") int maxAttempts,
            @Value("${notification.worker.lease-timeout-minutes}") long leaseTimeoutMinutes) {
        this.jobRepository = jobRepository;
        this.attemptRepository = attemptRepository;
        this.templateService = templateService;
        this.emailSender = emailSender;
        this.batchSize = batchSize;
        this.maxAttempts = maxAttempts;
        this.leaseTimeoutMinutes = leaseTimeoutMinutes;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    public void processOnce() {
        LocalDateTime now = LocalDateTime.now();

        transactionTemplate.executeWithoutResult(status -> jobRepository.reclaimTimedOutJobs(
                now.minusMinutes(leaseTimeoutMinutes),
                now));

        LocalDateTime claimTime = LocalDateTime.now();

        List<UUID> candidateIds = transactionTemplate.execute(status -> jobRepository.findClaimCandidateIds(
                claimTime,
                PageRequest.of(0, batchSize)));

        for (UUID jobId : candidateIds) {
            Boolean claimed = transactionTemplate
                    .execute(status -> jobRepository.claimIfAvailable(jobId, claimTime, workerId) == 1);

            if (Boolean.TRUE.equals(claimed)) {
                processClaimedJob(jobId);
            }
        }
    }

    private void processClaimedJob(UUID jobId) {
        NotificationJob job = transactionTemplate.execute(status -> jobRepository.findById(jobId).orElseThrow());

        EmailContent email = templateService.render(
                job.getEventType(),
                job.getPayload());

        LocalDateTime startedAt = LocalDateTime.now();

        try {
            emailSender.send(
                    job.getRecipientEmail(),
                    email.subject(),
                    email.body());
        } catch (RuntimeException e) {
            LocalDateTime finishedAt = LocalDateTime.now();

            transactionTemplate.executeWithoutResult(status -> {
                NotificationJob current = jobRepository.findById(jobId).orElseThrow();

                int attemptNo = current.getAttemptCount() + 1;
                String attemptStatus;

                if (attemptNo >= maxAttempts) {
                    current.markFailed(e.getMessage());
                    attemptStatus = "FAILED";
                } else {
                    long retryDelayMinutes = switch (attemptNo) {
                        case 1 -> 1;
                        case 2 -> 5;
                        default -> 30;
                    };

                    current.markRetry(
                            finishedAt.plusMinutes(retryDelayMinutes),
                            e.getMessage());
                    attemptStatus = "RETRY";
                }

                attemptRepository.save(new NotificationJobAttempt(
                        jobId,
                        attemptNo,
                        attemptStatus,
                        e.getMessage(),
                        startedAt,
                        finishedAt));
            });
            return;
        }

        LocalDateTime finishedAt = LocalDateTime.now();

        transactionTemplate.executeWithoutResult(status -> {
            NotificationJob current = jobRepository.findById(jobId).orElseThrow();

            int attemptNo = current.getAttemptCount() + 1;
            current.markSent(finishedAt);

            attemptRepository.save(new NotificationJobAttempt(
                    jobId,
                    attemptNo,
                    "SENT",
                    null,
                    startedAt,
                    finishedAt));
        });
    }
}