package online.maxp.app.telephony;

import java.util.concurrent.atomic.AtomicBoolean;

public class CallSessionManager {
    private static CallSessionManager instance;

    private String currentSessionId;
    private String currentOrderId;
    private String currentCustomerPhone;
    private long offhookTimestamp = 0;
    private long idleTimestamp = 0;
    private AtomicBoolean isCallInProgress = new AtomicBoolean(false);

    private CallCompletionListener listener;

    public interface CallCompletionListener {
        void onCallFinished(String sessionId, String orderId, String phone, int durationSeconds);
    }

    private CallSessionManager() {}

    public static synchronized CallSessionManager getInstance() {
        if (instance == null) {
            instance = new CallSessionManager();
        }
        return instance;
    }

    public void startSession(String sessionId, String orderId, String customerPhone) {
        this.currentSessionId = sessionId;
        this.currentOrderId = orderId;
        this.currentCustomerPhone = customerPhone;
        this.offhookTimestamp = 0;
        this.idleTimestamp = 0;
        this.isCallInProgress.set(true);
    }

    public void setOffhook() {
        if (this.isCallInProgress.get() && this.offhookTimestamp == 0) {
            this.offhookTimestamp = System.currentTimeMillis();
        }
    }

    public void setIdle() {
        if (this.isCallInProgress.get()) {
            this.idleTimestamp = System.currentTimeMillis();
            int durationSeconds = 0;
            if (this.offhookTimestamp > 0) {
                durationSeconds = (int) ((this.idleTimestamp - this.offhookTimestamp) / 1000);
            }
            this.isCallInProgress.set(false);

            if (this.listener != null) {
                this.listener.onCallFinished(
                    this.currentSessionId,
                    this.currentOrderId,
                    this.currentCustomerPhone,
                    Math.max(0, durationSeconds)
                );
            }
        }
    }

    public void setListener(CallCompletionListener listener) {
        this.listener = listener;
    }

    public boolean isCallInProgress() {
        return this.isCallInProgress.get();
    }
}
