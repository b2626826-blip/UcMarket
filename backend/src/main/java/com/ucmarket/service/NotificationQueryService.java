package com.ucmarket.service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.internal.ClosingMarketResponse;
import com.ucmarket.dto.internal.DigestResponse;
import com.ucmarket.dto.internal.FailedNotificationsResponse;
import com.ucmarket.dto.internal.FailedNotificationsResponse.FailedNotificationItem;

// n8n 內部 API 的唯讀聚合查詢。刻意用 JdbcTemplate 直下 SQL、零 entity 依賴：
// 不碰別人的 repository、不觸發 JPA 關聯載入；時間窗界一律在 Java 算好傳參，
// SQL 不做日期運算——H2（測試）與 PostgreSQL（正式）通吃。
@Service
public class NotificationQueryService {

    private final JdbcTemplate jdbcTemplate;

    public NotificationQueryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public DigestResponse digest(LocalDate date) {
        Timestamp from = Timestamp.valueOf(date.atStartOfDay());
        Timestamp to = Timestamp.valueOf(date.plusDays(1).atStartOfDay());

        Long newMarketCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM markets WHERE created_at >= ? AND created_at < ?",
                Long.class, from, to);

        // 待審數是「現在有多少張躺著等審」的快照，刻意不帶時間窗——管理員關心的是積壓量
        Long pendingReviewCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM markets WHERE status = 'PENDING'",
                Long.class);

        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM trades WHERE created_at >= ? AND created_at < ?",
                (rs, rowNum) -> new DigestResponse(
                        date,
                        newMarketCount,
                        pendingReviewCount,
                        rs.getLong(1),
                        rs.getBigDecimal(2).setScale(2)),
                from, to);
    }

    @Transactional(readOnly = true)
    public List<ClosingMarketResponse> closingMarkets(int withinHours) {
        LocalDateTime now = LocalDateTime.now();
        Timestamp from = Timestamp.valueOf(now);
        Timestamp to = Timestamp.valueOf(now.plusHours(withinHours));

        return jdbcTemplate.query(
                """
                SELECT m.id, m.title, m.close_at, u.username
                FROM markets m
                JOIN users u ON u.id = m.creator_id
                WHERE m.status = 'ACTIVE'
                  AND m.close_at > ? AND m.close_at <= ?
                  AND (u.code IS NULL OR u.code NOT LIKE 'SYS-%')
                ORDER BY m.close_at ASC
                """,
                (rs, rowNum) -> new ClosingMarketResponse(
                        rs.getObject(1, UUID.class),
                        rs.getString(2),
                        rs.getTimestamp(3).toLocalDateTime(),
                        rs.getString(4)),
                from, to);
    }

    @Transactional(readOnly = true)
    public FailedNotificationsResponse failedNotifications(int recentLimit) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_jobs WHERE status = 'FAILED'",
                Long.class);

        List<FailedNotificationItem> recent = jdbcTemplate.query(
                """
                SELECT id, event_type, recipient_email, last_error, updated_at
                FROM notification_jobs
                WHERE status = 'FAILED'
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (rs, rowNum) -> new FailedNotificationItem(
                        rs.getObject(1, UUID.class),
                        rs.getString(2),
                        rs.getString(3),
                        rs.getString(4),
                        rs.getTimestamp(5).toLocalDateTime()),
                recentLimit);

        return new FailedNotificationsResponse(count, recent);
    }
}
