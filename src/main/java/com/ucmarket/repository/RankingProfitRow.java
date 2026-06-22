package com.ucmarket.repository;

import java.math.BigDecimal;
import java.util.UUID;

public interface RankingProfitRow {

	UUID getUserId();

	String getUsername();

	String getAvatarUrl();

	BigDecimal getTotalPayout();

	BigDecimal getSettledCost();

	BigDecimal getRealizedProfit();
}