package com.ucmarket.repository;

import java.math.BigDecimal;
import java.util.UUID;

public interface MarketVolume {
	UUID getMarketId();
	BigDecimal getVolume();
}
