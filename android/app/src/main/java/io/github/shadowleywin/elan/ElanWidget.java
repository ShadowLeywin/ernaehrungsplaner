package io.github.shadowleywin.elan;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Widget für den Startbildschirm: kcal übrig und Wasser von heute.
 *
 * Die Werte schreibt die App über WidgetPlugin in einen kleinen privaten Speicher, sobald "Heute"
 * gezeichnet wird oder Wasser dazukommt. Das Widget liest nur; es rechnet nichts selbst.
 * Stammen die Werte von einem anderen Tag (nach Mitternacht), zeigt es keine alten Zahlen,
 * sondern bittet, Elan zu öffnen. Android fragt das Widget alle 30 Minuten neu ab.
 */
public class ElanWidget extends AppWidgetProvider {

    static final String SPEICHER = "elan_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager verwalter, int[] ids) {
        RemoteViews ansicht = ansicht(context);
        for (int id : ids) verwalter.updateAppWidget(id, ansicht);
    }

    /** Alle Widgets dieser App neu zeichnen; aufgerufen, wenn die App neue Werte liefert. */
    static void aktualisiereAlle(Context context) {
        AppWidgetManager verwalter = AppWidgetManager.getInstance(context);
        int[] ids = verwalter.getAppWidgetIds(new ComponentName(context, ElanWidget.class));
        if (ids.length == 0) return;
        RemoteViews ansicht = ansicht(context);
        for (int id : ids) verwalter.updateAppWidget(id, ansicht);
    }

    static RemoteViews ansicht(Context context) {
        SharedPreferences werte = context.getSharedPreferences(SPEICHER, Context.MODE_PRIVATE);
        RemoteViews ansicht = new RemoteViews(context.getPackageName(), R.layout.elan_widget);
        NumberFormat zahl = NumberFormat.getIntegerInstance(Locale.GERMANY);

        String heute = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date());
        boolean aktuell = heute.equals(werte.getString("datum", ""));

        if (aktuell) {
            int kcalUebrig = werte.getInt("kcalUebrig", 0);
            int wasser = werte.getInt("wasserMl", 0);
            int wasserZiel = Math.max(1, werte.getInt("wasserZielMl", 2500));
            ansicht.setTextViewText(R.id.widget_kcal, zahl.format(Math.abs(kcalUebrig)));
            ansicht.setTextViewText(R.id.widget_kcal_text, kcalUebrig < 0 ? "kcal drüber" : "kcal übrig");
            ansicht.setTextViewText(R.id.widget_wasser, "Wasser " + zahl.format(wasser) + " von " + zahl.format(wasserZiel) + " ml");
            ansicht.setProgressBar(R.id.widget_wasser_balken, 100, Math.min(100, Math.round(wasser * 100f / wasserZiel)), false);
        } else {
            ansicht.setTextViewText(R.id.widget_kcal, "–");
            ansicht.setTextViewText(R.id.widget_kcal_text, "Öffne Elan für heute");
            ansicht.setTextViewText(R.id.widget_wasser, "");
            ansicht.setProgressBar(R.id.widget_wasser_balken, 100, 0, false);
        }

        // Antippen öffnet die App; FLAG_IMMUTABLE ist ab Android 12 Pflicht
        Intent oeffnen = new Intent(context, MainActivity.class);
        oeffnen.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tippen = PendingIntent.getActivity(context, 0, oeffnen, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        ansicht.setOnClickPendingIntent(R.id.widget_wurzel, tippen);
        return ansicht;
    }
}
