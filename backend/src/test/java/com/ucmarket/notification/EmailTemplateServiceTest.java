package com.ucmarket.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

public class EmailTemplateServiceTest {

    @Test
    void render_marketSubmitted_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_SUBMITTED,
                """
                        {
                            "marketTitle": "Will it rain tomorrow?"
                        }
                                """);

        assertEquals("[UcMarket] Market submitted", email.subject());
        assertEquals("Your market \"Will it rain tomorrow?\" was submitted for review.", email.body());
    }
}