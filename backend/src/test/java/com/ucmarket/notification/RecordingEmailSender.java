package com.ucmarket.notification;

import java.util.ArrayList;
import java.util.List;

import org.springframework.transaction.support.TransactionSynchronizationManager;

public final class RecordingEmailSender implements EmailSender {

    private final List<SentEmail> sentEmails = new ArrayList<>();

    @Override
    public void send(String recipientEmail, String subject, String body) {
        if (nextFailure != null) {
            RuntimeException failure = nextFailure;
            nextFailure = null;
            throw failure;
        }

        sentEmails.add(new SentEmail(
                recipientEmail,
                subject,
                body,
                TransactionSynchronizationManager.isActualTransactionActive()));
    }

    private RuntimeException nextFailure;

    public void failNextSend(RuntimeException failure) {
        this.nextFailure = failure;
    }

    public List<SentEmail> sentEmails() {
        return List.copyOf(sentEmails);
    }

    public record SentEmail(
            String recipientEmail,
            String subject,
            String body,
            boolean transactionActive) {
    }
}
