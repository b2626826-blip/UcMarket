package com.ucmarket.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "market_price_history")
public class MarketPriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "market_id", nullable = false)
    private UUID marketId;

    @Column(name = "option_id")
    private UUID optionId;

    @Column(name = "yes_price", precision = 18, scale = 4)
    private BigDecimal yesPrice;

    @Column(name = "no_price", precision = 18, scale = 4)
    private BigDecimal noPrice;

    @Column(name = "option_price", precision = 18, scale = 4)
    private BigDecimal optionPrice;

    @Column(name = "trade_volume", nullable = false, precision = 18, scale = 2)
    private BigDecimal tradeVolume = BigDecimal.ZERO;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();

    protected MarketPriceHistory() {}

    public MarketPriceHistory(UUID marketId, BigDecimal yesPrice, BigDecimal noPrice, BigDecimal tradeVolume) {
        this.marketId = marketId;
        this.yesPrice = yesPrice;
        this.noPrice = noPrice;
        this.tradeVolume = tradeVolume;
    }

    public UUID getId() { return id; }
    public UUID getMarketId() { return marketId; }
    public UUID getOptionId() { return optionId; }
    public BigDecimal getYesPrice() { return yesPrice; }
    public BigDecimal getNoPrice() { return noPrice; }
    public BigDecimal getOptionPrice() { return optionPrice; }
    public BigDecimal getTradeVolume() { return tradeVolume; }
    public LocalDateTime getRecordedAt() { return recordedAt; }
}
