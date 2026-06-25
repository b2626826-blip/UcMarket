package com.ucmarket;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class VerifyBcryptHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "password";
        String dbHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
        
        boolean matches = encoder.matches(password, dbHash);
        System.out.println("Password 'password' matches DB hash: " + matches);
        
        // Also test what hash would be generated for "password"
        String generatedHash = encoder.encode(password);
        System.out.println("Generated hash for 'password': " + generatedHash);
        System.out.println("DB hash: " + dbHash);
    }
}
