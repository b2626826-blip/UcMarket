package com.ucmarket.config;

import java.io.IOException;
import java.io.InputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

import jakarta.annotation.PostConstruct;

@Configuration
@ConditionalOnProperty(name = "firebase.service-account.path")
public class FirebaseConfig {

    private final Resource serviceAccountResource;

    public FirebaseConfig(@Value("${firebase.service-account.path}") Resource serviceAccountResource) {
        this.serviceAccountResource = serviceAccountResource;
    }

    @PostConstruct
    public void initialize() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            try (InputStream is = serviceAccountResource.getInputStream()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(is))
                        .build();
                FirebaseApp.initializeApp(options);
            }
        }
    }
}
