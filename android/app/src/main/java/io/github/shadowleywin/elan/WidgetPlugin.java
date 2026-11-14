package io.github.shadowleywin.elan;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Brücke von der Web-App zum Widget. Aufruf aus js/plattform.js:
 * Capacitor.nativePromise('ElanWidget', 'aktualisiere', { datum, kcalUebrig, wasserMl, wasserZielMl }).
 * Die Werte bleiben auf dem Gerät (privater Speicher der App, von der Android-Sicherung ausgenommen).
 */
@CapacitorPlugin(name = "ElanWidget")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void aktualisiere(PluginCall call) {
        Context context = getContext();
        context.getSharedPreferences(ElanWidget.SPEICHER, Context.MODE_PRIVATE).edit()
            .putString("datum", call.getString("datum", ""))
            .putInt("kcalUebrig", call.getInt("kcalUebrig", 0))
            .putInt("wasserMl", call.getInt("wasserMl", 0))
            .putInt("wasserZielMl", call.getInt("wasserZielMl", 2500))
            .apply();
        ElanWidget.aktualisiereAlle(context);
        call.resolve();
    }
}
