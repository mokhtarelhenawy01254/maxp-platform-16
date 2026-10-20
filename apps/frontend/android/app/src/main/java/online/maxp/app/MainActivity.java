package online.maxp.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import online.maxp.app.telephony.MaxPTelephonyPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MaxPTelephonyPlugin.class);
        super.onCreate(savedInstanceState);
        configureWebViewUserAgent();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebViewUserAgent();
    }

    private void configureWebViewUserAgent() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebSettings settings = getBridge().getWebView().getSettings();
                String currentUa = settings.getUserAgentString();
                if (currentUa != null && !currentUa.contains("MaxP-Native-Android")) {
                    String versionName = "1.2.0";
                    try {
                        versionName = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                    } catch (Exception ignored) {}
                    settings.setUserAgentString(currentUa + " MaxP-Native-Android/" + versionName);
                }
            }
        } catch (Exception e) {
            // ignore
        }
    }
}
