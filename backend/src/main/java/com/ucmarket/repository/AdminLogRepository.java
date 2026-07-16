package com.ucmarket.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.AdminLog;

public interface AdminLogRepository extends JpaRepository<AdminLog, UUID> {

	@Query("""
			SELECT l FROM AdminLog l
			WHERE (:action IS NULL OR :action = '' OR l.action = :action)
			AND (
				:kwPattern IS NULL
				OR LOWER(l.action) LIKE :kwPattern
				OR LOWER(CAST(l.metadata AS string)) LIKE :kwPattern
				OR LOWER(COALESCE(l.code, '')) LIKE :kwPattern
			)
			""")
	Page<AdminLog> searchByPattern(
			@Param("action") String action,
			@Param("kwPattern") String kwPattern,
			Pageable pageable);

	default Page<AdminLog> search(String action, String keyword, Pageable pageable) {
		String act = (action == null || action.isBlank()) ? null : action.trim();
		String kwPattern = (keyword == null || keyword.isBlank()) ? null
				: "%" + keyword.trim().toLowerCase() + "%";
		return searchByPattern(act, kwPattern, pageable);
	}
}
