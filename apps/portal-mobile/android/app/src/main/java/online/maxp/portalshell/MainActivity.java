package online.maxp.portalshell;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.DownloadListener;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
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
                settings.setMediaPlaybackRequiresUserGesture(false);

                String currentUa = settings.getUserAgentString();
                if (currentUa != null && !currentUa.contains("MaxP-Native-Android")) {
                    String versionName = "1.0.0";
                    try {
                        versionName = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                    } catch (Exception ignored) {}
                    settings.setUserAgentString(
                        currentUa + " MaxP-Native-Android MaxP-Portal-Shell/" + versionName
                    );
                }

                getBridge().getWebView().setDownloadListener(new DownloadListener() {
                    @Override
                    public void onDownloadStart(
                        String url,
                        String userAgent,
                        String contentDisposition,
                        String mimetype,
                        long contentLength
                    ) {
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
        } catch (Exception ignored) {}
    }
}
