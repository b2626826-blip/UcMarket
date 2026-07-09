package com.ucmarket.repository;

import java.math.BigDecimal;
import java.util.UUID;

public interface RankingWinRateRow {

	UUID getUserId();

	String getUsername();

	String getAccount();

	String getPrimaryMarket();

	String getAvatarUrl();

	Long getResolvedMarketCount();

	Long getCorrectCount();

	BigDecimal getWinRate();
}
