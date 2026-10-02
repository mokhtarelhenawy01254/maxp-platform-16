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
