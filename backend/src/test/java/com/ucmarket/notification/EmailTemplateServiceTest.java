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

    @Test
    void render_marketSubmittedForAdmin_usesPendingReviewMessage() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_SUBMITTED,
                """
                        {
                            "marketTitle": "Will it rain tomorrow?",
                            "recipientType": "ADMIN"
                        }
                        """);

        assertEquals("[UcMarket] Market awaiting review", email.subject());
        assertEquals(
                "Market \"Will it rain tomorrow?\" was submitted and is awaiting review.",
                email.body());
    }

    @Test
    void render_marketSubmittedForCreatorAdmin_combinesConfirmationAndReviewMessage() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_SUBMITTED,
                """
                        {
                            "marketTitle": "Will it rain tomorrow?",
                            "recipientType": "CREATOR_ADMIN"
                        }
                        """);

        assertEquals("[UcMarket] Market submitted and awaiting your review", email.subject());
        assertEquals(
                "Your market \"Will it rain tomorrow?\" was submitted and is awaiting your review.",
                email.body());
    }
}
