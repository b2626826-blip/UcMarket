package com.ucmarket.entity;

import java.math.BigDecimal;
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

@Entity
@Table(name = "markets")

public class Market {
	
	@Id
	@GeneratedValue( strategy = GenerationType.UUID)
	private UUID id;
	
	@Column( nullable = false, length = 255)
	private String title;
	
	@Column( columnDefinition = "text")
	private String description;
	
	@Column( length = 64)
	private String category;
	
	@Column( name = "source_url", columnDefinition = "text")
	private String sourceUrl;
	
	@Column( name = "resolution_rule", columnDefinition = "text")
	private String resolutionRule;
	
	@Column( name = "market_type", nullable = false, length = 32)
	private String marketType = "BINARY";

	@Column( name = "creator_id", nullable = false)
	private UUID creatorId;

	@Column( name = "close_at", nullable = false)
	private LocalDateTime closeAt;

	@Enumerated( EnumType.STRING)
	@Column( nullable = false)
	private MarketStatus status = MarketStatus.DRAFT;
	
	@Enumerated( EnumType.STRING)
	private MarketResult result;
	
	@Column( name = "result_value", precision = 18, scale = 2)
	private BigDecimal resultValue;

	@Column( name = "approved_at")
	private LocalDateTime approvedAt;

	@Column( name = "approved_by")
	private UUID approvedBy;

	@Column( name = "resolved_at")
	private LocalDateTime resolvedAt;

	@Column( name = "resolved_by")
	private UUID resolvedBy;

	@Column( name = "yes_pool", nullable = false)
	private BigDecimal yesPool = BigDecimal.valueOf(100);
	
	@Column( name = "no_pool", nullable = false)
	private BigDecimal noPool = BigDecimal.valueOf(100);
	
	@Column( name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column( name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	protected Market() {
	}

	public Market(
		String title,
		String description,
		String category,
		String sourceUrl,
		String resolutionRule,
		LocalDateTime closeAt
	) {
		this.title = title;
		this.description = description;
		this.category = category;
		this.sourceUrl = sourceUrl;
		this.resolutionRule = resolutionRule;
		this.closeAt = closeAt;
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
	
	public UUID getId() {
		return id;
	}
	
	public String getTitle() {
		return title;
	}
	
	public String getDescription() {
		return description;
	}
	
	public String getCategory() {
		return category;
	}
	
	public String getSourceUrl() {
	    return sourceUrl;
	}
	
	public String getResolutionRule() {
		return resolutionRule;
	}
	
	public LocalDateTime getCloseAt() {
		return closeAt;
	}
	
	public MarketStatus getStatus() {
		return status;
	}

	public void changeStatus(MarketStatus status) {
		this.status = status;
	}

	public void approve(UUID adminId) {
		this.status = MarketStatus.ACTIVE;
		this.approvedAt = LocalDateTime.now();
		this.approvedBy = adminId;
	}

	public void reject() {
		this.status = MarketStatus.REJECTED;
	}

	public void resolve(MarketResult result, UUID adminId) {
		this.status = MarketStatus.RESOLVED;
		this.result = result;
		this.resolvedAt = LocalDateTime.now();
		this.resolvedBy = adminId;
	}
	
	public MarketResult getResult() {
		return result;
	}

	public BigDecimal getResultValue() { return resultValue; }
	public LocalDateTime getUpdatedAt() { return updatedAt; }

	public LocalDateTime getApprovedAt() { return approvedAt; }
	public UUID getApprovedBy() { return approvedBy; }
	public LocalDateTime getResolvedAt() { return resolvedAt; }
	public UUID getResolvedBy() { return resolvedBy; }
	public UUID getCreatorId() { return creatorId; }
	public void setCreatorId(UUID creatorId) { this.creatorId = creatorId; }
	public String getMarketType() { return marketType; }

	public BigDecimal getYesPool() {
		return yesPool;
	}
	
	public BigDecimal getNoPool() {
		return noPool;
	}
	
	public void buy(MarketSide side, BigDecimal amount) {
		if (side == MarketSide.YES) {
			this.yesPool = this.yesPool.add(amount);
		} else {
			this.noPool = this.noPool.add(amount);
		}
	}
	
	public LocalDateTime getCreatedAt() {
		return createdAt;
	}
}
