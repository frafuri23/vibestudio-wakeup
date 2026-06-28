import Constants from "expo-constants";

type VibeAI = { proxy?: string; key?: string; provider?: string };

export function getAIConfig(): VibeAI | null {
  const ai = (Constants.expoConfig?.extra as any)?.vibestudio as VibeAI | undefined;
  return ai ?? null;
}

export function aiReady(): boolean {
  const ai = getAIConfig();
  return !!(ai && ai.key && ai.provider);
}

export interface VerifyResult {
  ok: boolean;    // true = oggetto corretto
  reason: string; // breve spiegazione in italiano
  error?: string; // errore tecnico se la chiamata fallisce
}

/**
 * Manda la foto all'endpoint VibeStudio /ai e chiede se l'oggetto è visibile.
 *
 * imageDataUrl può essere:
 *   - "data:image/jpeg;base64,<base64>"  (da expo-camera / expo-image-picker)
 *   - "<base64 puro>" (già estratto)
 *
 * L'endpoint accetta:
 *   {
 *     prompt: string,
 *     system?: string,
 *     json?: true,
 *     maxTokens?: number,
 *     images?: [{ mediaType: "image/jpeg", dataBase64: "<base64 senza prefisso>" }]
 *   }
 * e risponde con { text, json?, jsonError? }.
 */
export async function verifyPhoto(
  imageDataUrl: string,
  targetObject: string
): Promise<VerifyResult> {
  const ai = getAIConfig();
  if (!ai?.key || !ai?.provider) {
    return {
      ok: false,
      reason: "",
      error:
        "Questa app richiede una chiave AI. Aggiungi ANTHROPIC_API_KEY (oppure OPENAI_API_KEY / OPENROUTER_API_KEY) in Environment.",
    };
  }

  // Estrai il base64 puro rimuovendo l'eventuale prefisso data URI
  let dataBase64 = imageDataUrl;
  let mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg";

  if (imageDataUrl.startsWith("data:")) {
    const commaIdx = imageDataUrl.indexOf(",");
    if (commaIdx !== -1) {
      const header = imageDataUrl.substring(5, commaIdx); // es. "image/jpeg;base64"
      if (header.startsWith("image/png")) mediaType = "image/png";
      else if (header.startsWith("image/webp")) mediaType = "image/webp";
      dataBase64 = imageDataUrl.substring(commaIdx + 1);
    }
  }

  const system =
    "Sei un verificatore per una sveglia anti-snooze. " +
    "L'utente deve fotografare un oggetto specifico per spegnere la sveglia. " +
    "Guarda l'immagine allegata e decidi se l'oggetto richiesto è chiaramente presente e riconoscibile. " +
    "Sii ragionevole: accetta anche foto parziali o un po' sfocate se l'oggetto è identificabile. " +
    'Rispondi SOLO con JSON valido, senza markdown, senza testo extra: {"match":true,"reason":"..."} oppure {"match":false,"reason":"..."}';

  const prompt =
    `L'oggetto richiesto è: "${targetObject}". ` +
    `Guarda l'immagine e dimmi se "${targetObject}" è chiaramente visibile. ` +
    `Rispondi con JSON: {"match":true/false,"reason":"breve frase in italiano"}`;

  try {
    const res = await fetch(`${ai.proxy}/ai`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vibestudio-app-key": ai.key,
      },
      body: JSON.stringify({
        system,
        prompt,
        images: [{ mediaType, dataBase64 }],
        json: true,
        maxTokens: 200,
      }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({} as any));
      return {
        ok: false,
        reason: "",
        error: e.error || `Errore verifica AI (${res.status}). Riprova.`,
      };
    }

    const data = await res.json();

    // data.json è già parsato lato server quando json:true
    const parsed = data.json;
    if (parsed && typeof parsed.match === "boolean") {
      return { ok: parsed.match, reason: parsed.reason || "" };
    }

    // Fallback se il server non è riuscito a parsare il JSON
    if (data.jsonError || data.text) {
      const raw: string = (data.text || "").toLowerCase();
      const hasTrue = raw.includes('"match":true') || raw.includes('"match": true');
      const hasFalse = raw.includes('"match":false') || raw.includes('"match": false');
      if (hasTrue && !hasFalse) return { ok: true, reason: data.text };
      if (hasFalse) return { ok: false, reason: data.text };
    }

    return {
      ok: false,
      reason: "",
      error: "Risposta AI non riconosciuta. Riprova.",
    };
  } catch (err: any) {
    return {
      ok: false,
      reason: "",
      error: "Errore di rete durante la verifica. Controlla la connessione.",
    };
  }
}
