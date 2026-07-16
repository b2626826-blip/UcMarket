package com.ucmarket.service;

import java.math.BigDecimal;

public final class OddsRules {

	public static final BigDecimal MIN_ODDS = new BigDecimal("1.5");
	public static final BigDecimal MAX_ODDS = new BigDecimal("5.0");

	private OddsRules() {
	}

	public static BigDecimal clamp(BigDecimal odds) {
		if (odds.compareTo(MAX_ODDS) > 0) {
			return MAX_ODDS;
		}
		if (odds.compareTo(MIN_ODDS) < 0) {
			return MIN_ODDS;
		}
		return odds;
	}

	public static boolean isWithinRange(BigDecimal odds) {
		return odds.compareTo(MIN_ODDS) >= 0 && odds.compareTo(MAX_ODDS) <= 0;
	}
}
