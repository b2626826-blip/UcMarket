package com.ucmarket.exception;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class MarketPreReviewBlockedException extends ResponseStatusException {

    public MarketPreReviewBlockedException(List<String> blockingRuleCodes) {
        super(
                HttpStatus.BAD_REQUEST,
                "Market pre-review blocked by: " + String.join(", ", blockingRuleCodes));
    }
}
