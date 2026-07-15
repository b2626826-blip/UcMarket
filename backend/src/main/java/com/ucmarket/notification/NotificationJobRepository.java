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

                j.lockedAt = :now,
                j.lockedBy = :workerId,
                j.updatedAt = :now
            where j.status = com.ucmarket.notification.NotificationJobStatus.PROCESSING and j.lockedAt < :cutoff
            """)

    int reclaimTimedOtuJobs(@Param("cutoff") LocalDateTime cutoff, @Param("now") LocalDateTime now);

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
}
