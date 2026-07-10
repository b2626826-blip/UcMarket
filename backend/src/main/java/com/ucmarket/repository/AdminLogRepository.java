package com.ucmarket.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.AdminLog;

public interface AdminLogRepository extends JpaRepository<AdminLog, UUID> {
}
