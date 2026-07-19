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

    @Test
    void render_marketApproved_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_APPROVED,
                """
                        {
                            "marketTitle": "Will it rain tomorrow?"
                        }
                        """);

        assertEquals("[UcMarket] Market approved", email.subject());
        assertEquals(
                "Your market \"Will it rain tomorrow?\" was approved and is now active.",
                email.body());
    }

    @Test
    void render_marketRejected_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_REJECTED,
                """
                        {
                            "marketTitle": "Will it rain tomorrow?",
                            "reason": "The source cannot be verified."
                        }
                        """);

        assertEquals("[UcMarket] Market rejected", email.subject());
        assertEquals(
                "Your market \"Will it rain tomorrow?\" was rejected. "
                        + "Reason: The source cannot be verified.",
                email.body());
    }

    @Test
    void render_marketChangesRequested_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_CHANGES_REQUESTED,
                """
                        {
                            "marketTitle": "Will it rain tomorrow?",
                            "comment": "Please add a verifiable source."
                        }
                        """);

        assertEquals("[UcMarket] Market changes requested", email.subject());
        assertEquals(
                "Changes were requested for your market \"Will it rain tomorrow?\". "
                        + "Comment: Please add a verifiable source.",
                email.body());
    }

    @Test
    void render_dailyPendingReviewSummary_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.DAILY_PENDING_REVIEW_SUMMARY,
                """
                        {
                            "summaryDate": "2026-07-17",
                            "pendingCount": 2,
                            "markets": [
                                {
                                    "marketId": "00000000-0000-4003-8000-000000000002",
                                    "marketTitle": "Will it rain tomorrow?"
                                },
                                {
                                    "marketId": "00000000-0000-4003-8000-000000000003",
                                    "marketTitle": "Will the index rise?"
                                }
                            ]
                        }
                        """);

        assertEquals("[UcMarket] Daily pending review summary", email.subject());
        assertEquals(
                """
                        Pending review summary for 2026-07-17: 2 market(s) awaiting review.
                        - Will it rain tomorrow?
                        - Will the index rise?""",
                email.body());
    }

    @Test
    void render_marketClosingReminder_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_CLOSING_REMINDER,
                """
                        {
                            "marketTitle": "Will the index rise?",
                            "closeAt": "2026-07-18T10:00"
                        }
                        """);

        assertEquals("[UcMarket] Market closing soon", email.subject());
        assertEquals(
                "Market \"Will the index rise?\" closes at 2026-07-18T10:00.",
                email.body());
    }

    @Test
    void render_marketResolved_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.MARKET_RESOLVED,
                """
                        {
                            "marketTitle": "Will the index rise?",
                            "result": "YES"
                        }
                        """);

        assertEquals("[UcMarket] Market resolved", email.subject());
        assertEquals(
                "Market \"Will the index rise?\" was resolved as YES.",
                email.body());
    }

    @Test
    void render_passwordReset_usesPayloadSnapshot() {
        EmailTemplateService service = new EmailTemplateService(new ObjectMapper());

        EmailTemplateService.EmailContent email = service.render(
                NotificationEventType.PASSWORD_RESET,
                """
                        {
                            "resetUrl": "http://localhost:5173/auth/reset-password?token=abc",
                            "username": "alice",
                            "expiresInMinutes": 10
                        }
                        """);

        assertEquals("[UcMarket] 重設密碼", email.subject());
        org.junit.jupiter.api.Assertions.assertTrue(email.body().contains("alice"));
        org.junit.jupiter.api.Assertions.assertTrue(email.body().contains("10 分鐘"));
        org.junit.jupiter.api.Assertions.assertTrue(
                email.body().contains("http://localhost:5173/auth/reset-password?token=abc"));
    }
}
