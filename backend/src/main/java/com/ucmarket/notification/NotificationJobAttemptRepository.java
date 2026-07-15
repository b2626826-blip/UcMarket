package com.ucmarket.notification;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationJobAttemptRepository extends JpaRepository<NotificationJobAttempt, UUID> {

    List<NotificationJobAttempt> findByJobIdOrderByAttemptNoAsc(UUID jobId);
}