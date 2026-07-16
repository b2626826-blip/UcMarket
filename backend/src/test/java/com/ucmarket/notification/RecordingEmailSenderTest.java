package com.ucmarket.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RecordingEmailSenderTest {

    @Test
    void send_recordsRecipientSubjectAndBody() {
        RecordingEmailSender sender = new RecordingEmailSender();
        EmailSender contract = sender;

        contract.send(
                "owner@example.com",
                "Market submitted",
                "Your market was submitted.");

        assertEquals(1, sender.sentEmails().size());

        RecordingEmailSender.SentEmail email = sender.sentEmails().get(0);
        assertEquals("owner@example.com", email.recipientEmail());
        assertEquals("Market submitted", email.subject());
        assertEquals("Your market was submitted.", email.body());
    }
}
