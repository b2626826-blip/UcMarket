package com.ucmarket.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.UserOAuthAccount;

public interface UserOAuthAccountRepository extends JpaRepository<UserOAuthAccount, UUID> {
    Optional<UserOAuthAccount> findByProviderAndProviderUid(String provider, String providerUid);

    void deleteByUserId(UUID userId);
}
