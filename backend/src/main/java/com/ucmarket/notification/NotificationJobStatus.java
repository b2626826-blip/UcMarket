package com.ucmarket.notification;

//工作的生命週期狀態機。PENDING（剛入隊）→ PROCESSING（被 Worker 領走）→ 成功變 SENT、暫時失敗變 RETRY（等下次重試，會再回到 PROCESSING）、重試耗盡變 FAILED
public enum NotificationJobStatus {
    PENDING,
    PROCESSING,
    RETRY,
    SENT,
    FAILED
}
