package online.maxp.app.telephony;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.util.Log;

public class CallStateReceiver extends BroadcastReceiver {
    private static final String TAG = "MaxP_CallStateReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(intent.getAction())) {
            return;
        }

        String stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        if (stateStr == null) {
            return;
        }

        Log.d(TAG, "Phone state changed: " + stateStr);
        CallSessionManager manager = CallSessionManager.getInstance();

        if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
            // بدأ التحدث في المكالمة
            manager.setOffhook();
        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(stateStr)) {
            // انتهت المكالمة وقفل الخط
            manager.setIdle();
        }
    }
}
