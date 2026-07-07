package com.ucmarket.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.Trade;

public interface TradeRepository extends JpaRepository<Trade, UUID> {
}