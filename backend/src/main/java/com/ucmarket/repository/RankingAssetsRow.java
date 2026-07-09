package com.ucmarket.repository;

import java.math.BigDecimal;
import java.util.UUID;

public interface RankingAssetsRow {

	UUID getUserId();

	String getUsername();

	String getAccount();

	String getPrimaryMarket();

	String getAvatarUrl();

	BigDecimal getWalletBalance();

	BigDecimal getOpenPositionValue();

	BigDecimal getTotalAssetValue();
}
