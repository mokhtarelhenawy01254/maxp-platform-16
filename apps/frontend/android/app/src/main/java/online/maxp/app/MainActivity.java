package online.maxp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import online.maxp.app.telephony.MaxPTelephonyPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MaxPTelephonyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
