package com.ucmarket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    List<User> findByRole(UserRole role);
    List<User> findByStatus(UserStatus status);
}
