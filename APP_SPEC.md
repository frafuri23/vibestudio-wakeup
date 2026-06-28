# Sveglia Caccia Oggetti

Sveglia anti-snooze: per spegnerla devi alzarti e fotografare un oggetto casuale di casa.
Claude (via endpoint AI managed) analizza la foto e conferma sì/no.

## Schermate
- **Home** (`Tabs`/HomeScreen): lista sveglie (orario, giorni, tono, switch), FAB +, ingranaggio Settings, pannello "Strumenti di test" per simulare una sveglia.
- **EditAlarm**: stepper orario custom (View-based, funziona nel preview), giorni, nome, difficoltà (1/2/3 oggetti), suoneria con preview 6s (audio reale solo su device).
- **AlarmRinging**: full screen, orario grande, animazione pulsazione (Animated core), un solo bottone "Disattiva" → Challenge.
- **Challenge**: fotocamera reale (expo-camera) su device; nel preview web fallback con image-picker. Mostra oggetto richiesto, scatta, verifica via `verifyPhoto`. Più oggetti in sequenza secondo difficoltà.
- **Settings**: stato abbonamento, gestione/ripristino (RevenueCat), cronologia risvegli, link supporto/privacy.
- **Paywall**: trial 7 giorni poi €4,99/mese (RevenueCat). Mostrato al primo avvio (`PaywallIntro`, non chiudibile) se non abbonato.

## Dati & stato
- `src/store.tsx`: Context con alarms, history, subscribed, onboarded, ringing. Persistenza AsyncStorage (`src/storage.ts`).
- Sveglie d'esempio seminate al primo avvio.
- `ringing` globale → `RingingWatcher` in App.tsx apre AlarmRinging.

## AI
- `src/ai.ts`: `verifyPhoto(dataUrl, oggetto)` → endpoint VibeStudio `/ai` con immagine, json:true. Richiede ANTHROPIC_API_KEY (o OPENAI/OPENROUTER) in Environment.

## Note runtime
- expo-camera / expo-av / RevenueCat / haptics sono inerti nel preview → fallback ovunque.
- Tema dark, accent #7c6cff, accent2 #4ad6c8.
