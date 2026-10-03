package online.maxp.app.telephony;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import online.maxp.app.MainActivity;
import online.maxp.app.R;

/**
 * خدمة أمامية دائمة تُبقي عملية التطبيق (ومعها WebView والسوكت الخاص بالمكالمات)
 * حية أثناء عمل التطبيق في الخلفية — بدلًا من قتل أندرويد للسوكت بعد إغلاق الشاشة.
 * بدونها: التطبيق في الجيب = موظف لا يمكن الوصول إليه للمكالمات.
 */
public class TelephonyForegroundService extends Service {
    private static final String TAG = "TelephonyFGS";
    private static final String CHANNEL_ID = "maxp_telephony_presence";
    private static final int NOTIFICATION_ID = 20250103;
    public static final String ACTION_START = "online.maxp.app.telephony.START";
    public static final String ACTION_STOP = "online.maxp.app.telephony.STOP";

    private PowerManager.WakeLock wakeLock;

    public static void start(Context context) {
        Intent intent = new Intent(context, TelephonyForegroundService.class);
        intent.setAction(ACTION_START);
        ContextCompat.startForegroundService(context, intent);
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, TelephonyForegroundService.class);
        context.stopService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // targetSdk 34+ يفرض نوع الخدمة المعلن في الـ manifest
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // قفل استيقاظ جزئي: يمنع أندرويد من إيقاف المعالج فتنام السوكت والنبض
        acquireWakeLock();

        return START_STICKY; // أندرويد يعيد تشغيلها إن قُتلت تحت ضغط الذاكرة
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MaxP:TelephonyPresence");
                wakeLock.setReferenceCounted(false);
                // 6 ساعات ثم يُجدد START_STICKY/إعادة فتح التطبيق — بديل آمن عن القفل الأبدي
                wakeLock.acquire(6 * 60 * 60 * 1000L);
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock acquire failed: " + e.getMessage());
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception ignored) {
        }
        wakeLock = null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "اتصالات MaxP",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("إبقاء الهاتف متصلًا لاستقبال أوامر المكالمات");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openApp, piFlags);

        Intent stopIntent = new Intent(this, TelephonyForegroundService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, 1, stopIntent, piFlags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MaxP متصل للمكالمات")
            .setContentText("هاتفك جاهز لاستقبال أوامر الاتصال — يمكنك تصغير التطبيق بأمان")
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setOngoing(true)
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .addAction(0, "إيقاف", stopPending)
            .build();
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
