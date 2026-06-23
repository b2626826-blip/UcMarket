package com.ucmarket.dto;

import java.math.BigDecimal;

public record MarketOddsResponse(
	    BigDecimal yesOdds,
	    BigDecimal noOdds,
	    BigDecimal yesPool,
	    BigDecimal noPool
	) {}
