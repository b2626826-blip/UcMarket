package com.ucmarket.repository;

import java.math.BigDecimal;
import java.util.UUID;

public interface RankingSnapshotRow {

	Long getRank();

	UUID getUserId();

	String getUsername();

	String getAccount();

	String getPrimaryMarket();

	String getAvatarUrl();

	BigDecimal getRealizedProfit();

	BigDecimal getWinRate();

	Long getResolvedMarketCount();

	BigDecimal getTotalAssetValue();

	Object getAsOf();
}
