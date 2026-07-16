package com.ucmarket.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;

public interface UserRepository extends JpaRepository<User, UUID> {
	Optional<User> findByEmail(String email);
	Optional<User> findByUsername(String username);
	boolean existsByEmail(String email);
	boolean existsByUsername(String username);

	long countByStatus(UserStatus status);
	long countByRole(UserRole role);
	long countByRoleAndStatus(UserRole role, UserStatus status);

	@Query("""
			SELECT u FROM User u
			WHERE (:role IS NULL OR u.role = :role)
			AND (:status IS NULL OR u.status = :status)
			AND (
				:kwPattern IS NULL
				OR LOWER(u.username) LIKE :kwPattern
				OR LOWER(u.email) LIKE :kwPattern
				OR LOWER(COALESCE(u.code, '')) LIKE :kwPattern
			)
			""")
	Page<User> searchByPattern(
			@Param("role") UserRole role,
			@Param("status") UserStatus status,
			@Param("kwPattern") String kwPattern,
			Pageable pageable);

	default Page<User> search(UserRole role, UserStatus status, String keyword, Pageable pageable) {
		String kwPattern = (keyword == null || keyword.isBlank()) ? null
				: "%" + keyword.trim().toLowerCase() + "%";
		return searchByPattern(role, status, kwPattern, pageable);
	}
}
