package online.maxp.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.DownloadListener;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import online.maxp.app.telephony.MaxPTelephonyPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MaxPTelephonyPlugin.class);
        super.onCreate(savedInstanceState);
        configureWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebView();
    }

    private void configureWebView() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebSettings settings = getBridge().getWebView().getSettings();
                // صوت الإشعارات داخل التطبيق: WebView بيمنع تشغيل الصوت
                // من غير لمسة مستخدم (autoplay). لازم نفك القيد ده.
                settings.setMediaPlaybackRequiresUserGesture(false);
                String currentUa = settings.getUserAgentString();
                if (currentUa != null && !currentUa.contains("MaxP-Native-Android")) {
                    String versionName = "1.2.1";
                    try {
                        versionName = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                    } catch (Exception ignored) {}
                    settings.setUserAgentString(currentUa + " MaxP-Native-Android/" + versionName);
                }

                // دعم تحميل الملفات والتحديثات عبر متصفح النظام ومدير التحميلات
                getBridge().getWebView().setDownloadListener(new DownloadListener() {
                    @Override
                    public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                        try {
                            if (url != null) {
                                Uri uri = Uri.parse(url);
                                String scheme = uri.getScheme();
                                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                                    intent.addCategory(Intent.CATEGORY_BROWSABLE);
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(intent);
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                });
            }
        } catch (Exception e) {
            // ignore
        }
    }
}
