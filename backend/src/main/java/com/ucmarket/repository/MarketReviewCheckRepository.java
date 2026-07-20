package com.ucmarket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.MarketReviewCheck;

public interface MarketReviewCheckRepository extends JpaRepository<MarketReviewCheck, UUID> {

    List<MarketReviewCheck> findByMarketIdAndSubmissionVersionOrderByRuleCode(
            UUID marketId,
            int submissionVersion);

    @Modifying
    @Query("""
            DELETE FROM MarketReviewCheck c
            WHERE c.marketId = :marketId
              AND c.submissionVersion = :submissionVersion
            """)
    void deleteByMarketIdAndSubmissionVersion(
            @Param("marketId") UUID marketId,
            @Param("submissionVersion") int submissionVersion);
}
