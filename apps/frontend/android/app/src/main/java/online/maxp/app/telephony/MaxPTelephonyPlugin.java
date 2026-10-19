package online.maxp.app.telephony;

import android.Manifest;
import android.app.ActivityOptions;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;
import java.util.UUID;

@CapacitorPlugin(
    name = "MaxPTelephony",
    permissions = {
        @Permission(
            alias = "phone",
            strings = { Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE }
        ),
        @Permission(
            alias = "callOnly",
            strings = { Manifest.permission.CALL_PHONE }
        )
    }
)
public class MaxPTelephonyPlugin extends Plugin {
    private static final String TAG = "MaxPTelephonyPlugin";
    private static final String PREF_NAME = "maxp_telephony_prefs";
    private static final String KEY_DEVICE_ID = "device_id";
    private static final String KEY_PREFERRED_SIM = "preferred_sim_slot";

    @Override
    public void load() {
        super.load();
        CallSessionManager.getInstance().setListener((sessionId, orderId, phone, durationSeconds) -> {
            JSObject ret = new JSObject();
            ret.put("sessionId", sessionId);
            ret.put("orderId", orderId);
            ret.put("phone", phone);
            ret.put("durationSeconds", durationSeconds);
            notifyListeners("callEnded", ret);
        });
    }

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String deviceId = prefs.getString(KEY_DEVICE_ID, null);

        if (deviceId == null) {
            deviceId = UUID.randomUUID().toString();
            prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply();
        }

        String deviceName = Build.MANUFACTURER + " " + Build.MODEL;

        JSObject ret = new JSObject();
        ret.put("deviceId", deviceId);
        ret.put("deviceName", deviceName);
        ret.put("osVersion", "Android " + Build.VERSION.RELEASE);
        ret.put("overlayGranted", Settings.canDrawOverlays(context));
        call.resolve(ret);
    }

    @PluginMethod
    public void isOverlayPermissionGranted(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", Settings.canDrawOverlays(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context context = getContext();
        try {
            if (!Settings.canDrawOverlays(context)) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("تعذر فتح إعدادات إذن الظهور فوق التطبيقات: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setPreferredSim(PluginCall call) {
        int slot = call.getInt("simSlot", 0);
        if (slot != 0 && slot != 1) {
            slot = 0;
        }
        getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_PREFERRED_SIM, slot)
            .apply();
        call.resolve();
    }

    /**
     * تشغيل الخدمة الأمامية: تُبقي عملية التطبيق (والسوكت والنبض) حية في الخلفية
     * بإشعار دائم — بدونها أندرويد يقتل السوكت بعد إغلاق الشاشة ولا يصل أمر الاتصال.
     */
    @PluginMethod
    public void startTelephonyService(PluginCall call) {
        try {
            TelephonyForegroundService.start(getContext());
            JSObject ret = new JSObject();
            ret.put("running", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("تعذر تشغيل خدمة الاتصال: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopTelephonyService(PluginCall call) {
        try {
            TelephonyForegroundService.stop(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("تعذر إيقاف خدمة الاتصال: " + e.getMessage());
        }
    }

    /** هل التطبيق معفى من تحسين البطارية؟ (إلزامي عمليًا على أجهزة هواوي/شاومي) */
    @PluginMethod
    public void isBatteryExempted(PluginCall call) {
        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            boolean exempted = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            JSObject ret = new JSObject();
            ret.put("exempted", exempted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("تعذر فحص إعفاء البطارية: " + e.getMessage());
        }
    }

    /** فتح نظام طلب الإعفاء من تحسين البطارية (ضغطة واحدة من الموظف) */
    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                call.resolve();
            } catch (Exception e2) {
                call.reject("تعذر فتح إعدادات البطارية: " + e2.getMessage());
            }
        }
    }

    @PluginMethod
    public void dialCustomer(PluginCall call) {
        String phone = call.getString("phone");
        String sessionId = call.getString("sessionId");
        String orderId = call.getString("orderId");
        Integer requestedSimSlot = call.getInt("simSlot", null);

        if (phone == null || phone.trim().isEmpty()) {
            call.reject("رقم الهاتف مطلوب");
            return;
        }

        // فحص صلاحية الاتصال الخلوي الفعلية مباشرة من النظام بدلاً من الاعتماد الحصري على حالة Capacitor
        boolean hasCallPermission = ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED;

        if (!hasCallPermission) {
            requestPermissionForAlias("callOnly", call, "callPermissionCallback");
            return;
        }

        performDirectAutoDial(phone, sessionId, orderId, requestedSimSlot, call);
    }

    @PermissionCallback
    private void callPermissionCallback(PluginCall call) {
        String phone = call.getString("phone");
        String sessionId = call.getString("sessionId");
        String orderId = call.getString("orderId");
        Integer requestedSimSlot = call.getInt("simSlot", null);

        boolean hasCallPermission = ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED;

        if (hasCallPermission) {
            performDirectAutoDial(phone, sessionId, orderId, requestedSimSlot, call);
        } else {
            // خطة احتياطية أخيرة في حال رفض الصلاحية: فتح لوحة المفاتيح
            try {
                Intent dialIntent = new Intent(Intent.ACTION_DIAL, buildPhoneUri(phone));
                dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(dialIntent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("method", "ACTION_DIAL_FALLBACK");
                ret.put("sessionId", sessionId);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("تم رفض إذن إجراء المكالمات الهاتفية المباشرة (CALL_PHONE)");
            }
        }
    }

    /**
     * محرك الاتصال المباشر الفوري (Triple-Tier Direct Auto-Dial Engine):
     * 1. إيقاظ شاشة الهاتف فورا حتى لو كانت مطفأة عبر WakeLock
     * 2. تحديد الشريحة (SIM 1 / SIM 2) تلقائياً لمنع توقف الهاتف عند مربع اختيار الشريحة
     * 3. تشغيل ACTION_CALL بصلاحيات الخلفية واستثناءات أندرويد 14+ للأنشطة في الخلفية
     */
    private void performDirectAutoDial(String phone, String sessionId, String orderId, Integer simSlotParam, PluginCall call) {
        Context context = getContext();
        try {
            // 1. إيقاظ المعالج والشاشة لمدة 8 ثوانٍ لضمان معالجة الاتصال
            wakeUpScreen(context);

            // 2. تسجيل الجلسة في مدير المكالمات لمراقبة التوقيت والإنهاء
            CallSessionManager.getInstance().startSession(sessionId, orderId, phone);

            // 3. تجهيز الـ Intent النقي بنوع ACTION_CALL
            Uri phoneUri = buildPhoneUri(phone);
            Intent callIntent = new Intent(Intent.ACTION_CALL, phoneUri);
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

            // 4. معالجة الهواتف ثنائية الشريحة (Dual-SIM) تلقائياً لمنع توقف الرنين
            int simSlot = getTargetSimSlot(context, simSlotParam);
            applyDualSimExtras(context, callIntent, phoneUri, simSlot);

            // 5. التنفيذ المباشر مع استثناءات أندرويد 14+ للأنشطة في الخلفية
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+
                ActivityOptions options = ActivityOptions.makeBasic();
                options.setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                );

                PendingIntent pi = PendingIntent.getActivity(
                    context,
                    (int) System.currentTimeMillis(),
                    callIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                try {
                    pi.send(context, 0, null, null, null, null, options.toBundle());
                } catch (Exception e) {
                    context.startActivity(callIntent);
                }
            } else {
                context.startActivity(callIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("method", "DIRECT_ACTION_CALL");
            ret.put("sessionId", sessionId);
            ret.put("phone", phoneUri.toString());
            ret.put("simSlotUsed", simSlot);
            call.resolve(ret);

        } catch (SecurityException secErr) {
            Log.w(TAG, "ACTION_CALL blocked by system background restrictions, attempting ACTION_DIAL fallback: " + secErr.getMessage());
            try {
                Intent dialIntent = new Intent(Intent.ACTION_DIAL, buildPhoneUri(phone));
                dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(dialIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("method", "ACTION_DIAL");
                ret.put("sessionId", sessionId);
                ret.put("warning", "Fell back to ACTION_DIAL: " + secErr.getMessage());
                call.resolve(ret);
            } catch (Exception dialErr) {
                call.reject("خطأ في الصلاحيات أثناء إجراء المكالمة: " + secErr.getMessage());
            }
        } catch (Exception e) {
            Log.e(TAG, "Fatal Exception in direct dial: " + e.getMessage(), e);
            try {
                Intent dialIntent = new Intent(Intent.ACTION_DIAL, buildPhoneUri(phone));
                dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(dialIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("method", "ACTION_DIAL");
                ret.put("sessionId", sessionId);
                call.resolve(ret);
            } catch (Exception dialErr) {
                call.reject("تعذر الاتصال بالرقم: " + e.getMessage());
            }
        }
    }

    private void wakeUpScreen(Context context) {
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "MaxP:AutoDialWakeUp"
                );
                wl.acquire(8000); // 8 ثوانٍ تكفي لبدء الرنين
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock acquire warning: " + e.getMessage());
        }
    }

    private int getTargetSimSlot(Context context, Integer explicitSlot) {
        if (explicitSlot != null && (explicitSlot == 0 || explicitSlot == 1)) {
            return explicitSlot;
        }
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .getInt(KEY_PREFERRED_SIM, 0); // 0 = SIM 1 افتراضياً
    }

    private void applyDualSimExtras(Context context, Intent intent, Uri phoneUri, int simSlot) {
        try {
            // أ) عبر TelecomManager (الطريقة الرسمية لأندرويد 6+)
            TelecomManager telecomManager = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            if (telecomManager != null && ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                List<PhoneAccountHandle> accounts = telecomManager.getCallCapablePhoneAccounts();
                if (accounts != null && !accounts.isEmpty()) {
                    PhoneAccountHandle targetHandle = null;
                    if (simSlot < accounts.size()) {
                        targetHandle = accounts.get(simSlot);
                    } else {
                        targetHandle = accounts.get(0);
                    }
                    if (targetHandle != null) {
                        intent.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, targetHandle);
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "TelecomManager dual sim query warning: " + e.getMessage());
        }

        // ب) عبر مفاتيح الشركات المصنعة (Samsung, Xiaomi, Oppo, MediaTek, Huawei)
        intent.putExtra("com.android.phone.force.slot", true);
        intent.putExtra("com.android.phone.extra.slot", simSlot);
        intent.putExtra("simSlot", simSlot);
        intent.putExtra("sim_slot", simSlot);
        intent.putExtra("slot_id", simSlot);
        intent.putExtra("simnum", simSlot);
        intent.putExtra("extra_asus_dial_use_dualsim", true);
    }

    private Uri buildPhoneUri(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return Uri.parse("tel:");
        }
        String clean = phone.trim().replaceAll("[\\s\\-\\(\\)]", "");
        // للأرقام المصرية: تحويل +20 إلى 0 المحلية لتوافق فوري مع كافة شبكات المحمول المصرية
        if (clean.startsWith("+20")) {
            clean = "0" + clean.substring(3);
        } else if (clean.startsWith("20") && clean.length() == 12) {
            clean = "0" + clean.substring(2);
        }
        return Uri.fromParts("tel", clean, null);
    }
}
