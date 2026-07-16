package com.ucmarket.notification;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "notification_jobs")
public class NotificationJob {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Enumerated(EnumType.STRING)
	@Column(name = "event_type", nullable = false, length = 50)
	private NotificationEventType eventType;

	@Column(name = "recipient_user_id")
	private UUID recipientUserId;

	@Column(name = "recipient_email", nullable = false, length = 255)
	private String recipientEmail;

	@Column(name = "market_id")
	private UUID marketId;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "payload", columnDefinition = "jsonb")
	private String payload;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private NotificationJobStatus status = NotificationJobStatus.PENDING;

	@Column(name = "attempt_count", nullable = false)
	private int attemptCount = 0;

	@Column(name = "next_attempt_at", nullable = false)
	private LocalDateTime nextAttemptAt;

	@Column(name = "idempotency_key", nullable = false, length = 255, unique = true)
	private String idempotencyKey;

	@Column(name = "locked_at")
	private LocalDateTime lockedAt;

	@Column(name = "locked_by", length = 100)
	private String lockedBy;

	@Column(name = "last_error", length = 1000)
	private String lastError;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@Column(name = "sent_at")
	private LocalDateTime sentAt;

	protected NotificationJob() {
	}

	public NotificationJob(
		NotificationEventType eventType,
		UUID recipientUserId,
		String recipientEmail,
		UUID marketId,
		String payload,
		String idempotencyKey
	) {
		this.eventType = eventType;
		this.recipientUserId = recipientUserId;
		this.recipientEmail = recipientEmail;
		this.marketId = marketId;
		this.payload = payload;
		this.idempotencyKey = idempotencyKey;
		this.nextAttemptAt = LocalDateTime.now();
	}

	@PrePersist
	void onCreate() {
		LocalDateTime now = LocalDateTime.now();
		if (createdAt == null) {
			createdAt = now;
		}
		if (updatedAt == null) {
			updatedAt = now;
		}
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = LocalDateTime.now();
	}

	public void markSent(LocalDateTime now) {
		this.status = NotificationJobStatus.SENT;
		this.sentAt = now;
		this.lockedAt = null;
		this.lockedBy = null;
		this.lastError = null;
	}

	public void markRetry(LocalDateTime nextAttemptAt, String error) {
		this.status = NotificationJobStatus.RETRY;
		this.attemptCount++;
		this.nextAttemptAt = nextAttemptAt;
		this.lastError = truncate(error);
		this.lockedAt = null;
		this.lockedBy = null;
	}

	public void markFailed(String error) {
		this.status = NotificationJobStatus.FAILED;
		this.attemptCount++;
		this.lastError = truncate(error);
		this.lockedAt = null;
		this.lockedBy = null;
	}

	private static String truncate(String error) {
		if (error == null) {
			return null;
		}
		return error.length() <= 1000 ? error : error.substring(0, 1000);
	}

	public UUID getId() { return id; }
	public NotificationEventType getEventType() { return eventType; }
	public UUID getRecipientUserId() { return recipientUserId; }
	public String getRecipientEmail() { return recipientEmail; }
	public UUID getMarketId() { return marketId; }
	public String getPayload() { return payload; }
	public NotificationJobStatus getStatus() { return status; }
	public int getAttemptCount() { return attemptCount; }
	public LocalDateTime getNextAttemptAt() { return nextAttemptAt; }
	public String getIdempotencyKey() { return idempotencyKey; }
	public LocalDateTime getLockedAt() { return lockedAt; }
	public String getLockedBy() { return lockedBy; }
	public String getLastError() { return lastError; }
	public LocalDateTime getCreatedAt() { return createdAt; }
	public LocalDateTime getSentAt() { return sentAt; }
}