# SONVIX Credits – Einrichtung (noch nicht live)
1. Neues kostenloses Supabase-Projekt erstellen.
2. SQL Editor öffnen und `supabase/migrations/001_credits.sql` ausführen.
3. In Supabase Auth E-Mail-Bestätigung und Missbrauchsschutz konfigurieren.
4. Erst danach Supabase URL und öffentlichen anon/publishable Key als Vercel-Umgebungsvariablen hinterlegen. Niemals service_role im Browser verwenden.
5. Login/Registrierung im Frontend ergänzen; Wallet und Transaktionen nur lesend anzeigen.
6. Einen vertrauenswürdigen Generierungs-Endpunkt anbinden, der Songjobs prüft und Credits reserviert. Bis dahin keine Credits für Entwürfe abbuchen.
7. Erfolgreiche Jobs bestätigen, fehlgeschlagene serverseitig erstatten.
8. Stripe-Abos und Pakete später über signierte Webhooks und eindeutige Zahlungs-IDs gutschreiben.

**Regeln:** Neukonto erhält 10 Credits, ein echter Song kostet 5. Der Bonus gilt pro Konto; gegen Mehrfachregistrierung sind weitere Kontrollen nötig. Dieses SQL führt noch keine Zahlungen oder KI-Musikgenerierung aus. Vor öffentlicher Nutzung müssen Auth-, Refund- und Idempotenzfälle getestet werden.
