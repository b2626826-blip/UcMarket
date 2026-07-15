package com.ucmarket.notification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationJobRepository extends JpaRepository<NotificationJob, UUID> {

    boolean existsByIdempotencyKey(String idempotencyKey);

    Page<NotificationJob> findByStatus(NotificationJobStatus status, Pageable pageable);

    List<NotificationJob> findByMarketIdAndEventType(UUID marketId, NotificationEventType eventType);

    @Query("""
            select j.id from NotificationJob j
            where j.status in
            ( com.ucmarket.notification.NotificationJobStatus.PENDING,
                com.ucmarket.notification.NotificationJobStatus.RETRY)
                and j.nextAttemptAt <= :now
                order by j.nextAttemptAt asc, j.createdAt asc
            """)
    List<UUID> findClaimCandidateIds(@Param("now") LocalDateTime now, Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("""
            update NotificationJob j
            set j.status = com.ucmarket.notification.NotificationJobStatus.PROCESSING,
                j.lockedAt = :lockedAt,
                j.lockedBy = :lockedBy,
                j.updatedAt = :lockedAt
            where j.id = :id
              and j.status in
              ( com.ucmarket.notification.NotificationJobStatus.PENDING,
                com.ucmarket.notification.NotificationJobStatus.RETRY)
            """)
    int claimIfAvailable(
            @Param("id") UUID id,
            @Param("lockedAt") LocalDateTime lockedAt,
            @Param("lockedBy") String lockedBy);

    @Modifying(clearAutomatically = true)
    @Query("""
            update NotificationJob j
            set j.status = com.ucmarket.notification.NotificationJobStatus.RETRY,
                j.nextAttemptAt = :now,
                j.lockedAt = null,
                j.lockedBy = null,
                j.updatedAt = :now
            where j.status = com.ucmarket.notification.NotificationJobStatus.PROCESSING
              and j.lockedAt < :cutoff
            """)
    int reclaimTimedOutJobs(@Param("cutoff") LocalDateTime cutoff, @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("""
            update NotificationJob j
            set j.status = com.ucmarket.notification.NotificationJobStatus.PENDING,
                j.nextAttemptAt = :now,
                j.lockedAt = null,
                j.lockedBy = null,
                j.updatedAt = :now
            where j.id = :id
              and j.status = com.ucmarket.notification.NotificationJobStatus.FAILED
            """)
    int resetForResend(@Param("id") UUID id, @Param("now") LocalDateTime now);

    @Modifying
    @Query(value = """
            insert into notification_jobs (
                id,
                event_type,
                recipient_user_id,
                recipient_email,
                market_id,
                payload,
                status,
                attempt_count,
                next_attempt_at,
                idempotency_key,
                created_at,
                updated_at
            )
            values (
                :id,
                :eventType,
                :recipientUserId,
                :recipientEmail,
                :marketId,
                cast(:payload as jsonb),
                'PENDING',
                0,
                current_timestamp,
                :idempotencyKey,
                current_timestamp,
                current_timestamp
            )
            on conflict do nothing
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("id") UUID id,
            @Param("eventType") String eventType,
            @Param("recipientUserId") UUID recipientUserId,
            @Param("recipientEmail") String recipientEmail,
            @Param("marketId") UUID marketId,
            @Param("payload") String payload,
            @Param("idempotencyKey") String idempotencyKey);
}
