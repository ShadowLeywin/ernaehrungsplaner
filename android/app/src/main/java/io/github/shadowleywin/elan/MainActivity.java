package io.github.shadowleywin.elan;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Elan als Android-App. Die Oberfläche ist dieselbe Web-App wie auf GitHub Pages,
 * ausgeliefert aus dem APK, also ohne Netz lauffähig.
 *
 * Zusatz: Teilt eine andere App Text an Elan ("Teilen" → Elan), öffnet Elan den Rezept-Import
 * mit diesem Text. Dafür wird die Startseite mit ?titel=…&text=… geladen; js/main.js wertet das aus,
 * genau wie beim Teilen-Ziel der Web-App.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        oeffneGeteilt(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        oeffneGeteilt(intent);
    }

    private void oeffneGeteilt(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String titel = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (text == null && titel == null) return;

        Uri.Builder adresse = Uri.parse(getBridge().getLocalUrl() + "/").buildUpon();
        if (titel != null) adresse.appendQueryParameter("titel", titel);
        if (text != null) adresse.appendQueryParameter("text", text);
        final String ziel = adresse.build().toString();
        // Erst laden, wenn die Brücke ihre Startseite angestoßen hat; sonst überschreibt sie unsere Adresse
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(ziel));
    }
}
