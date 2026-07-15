package com.ucmarket.notification;

public interface EmailSender {

    void send(String recipientEmail, String subject, String body);
}