package online.maxp.app.telephony;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.UUID;

@CapacitorPlugin(
    name = "MaxPTelephony",
    permissions = {
        @Permission(
            alias = "phone",
            strings = { Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE }
        )
    }
)
public class MaxPTelephonyPlugin extends Plugin {
    private static final String TAG = "MaxPTelephonyPlugin";
    private static final String PREF_NAME = "maxp_telephony_prefs";
    private static final String KEY_DEVICE_ID = "device_id";

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
        call.resolve(ret);
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
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
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
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            // بعض الأجهزة لا تدعم الـ intent المباشر — نسقط لصفحة إعدادات البطارية العامة
            try {
                Intent fallback = new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
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

        if (phone == null || phone.isEmpty()) {
            call.reject("رقم الهاتف مطلوب");
            return;
        }

        if (!getPermissionState("phone").equals(com.getcapacitor.PermissionState.GRANTED)) {
            requestPermissionForAlias("phone", call, "phonePermsCallback");
            return;
        }

        performDial(phone, sessionId, orderId, call);
    }

    @PermissionCallback
    private void phonePermsCallback(PluginCall call) {
        if (getPermissionState("phone").equals(com.getcapacitor.PermissionState.GRANTED)) {
            String phone = call.getString("phone");
            String sessionId = call.getString("sessionId");
            String orderId = call.getString("orderId");
            performDial(phone, sessionId, orderId, call);
        } else {
            call.reject("تم رفض إذن الاتصال الهاتفي وقراءة الحالة");
        }
    }

    private void performDial(String phone, String sessionId, String orderId, PluginCall call) {
        try {
            CallSessionManager.getInstance().startSession(sessionId, orderId, phone);

            Intent dialIntent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(phone)));
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(dialIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("sessionId", sessionId);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("خطأ في الصلاحيات أثناء إجراء المكالمة: " + e.getMessage());
        } catch (Exception e) {
            call.reject("تعذر الاتصال بالرقم: " + e.getMessage());
        }
    }
}
