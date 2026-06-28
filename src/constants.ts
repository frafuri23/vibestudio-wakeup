import { Difficulty, Tone, Weekday } from "./types";

export const WEEKDAY_LABELS: { key: Weekday; short: string; long: string }[] = [
  { key: 0, short: "L", long: "Lunedì" },
  { key: 1, short: "M", long: "Martedì" },
  { key: 2, short: "M", long: "Mercoledì" },
  { key: 3, short: "G", long: "Giovedì" },
  { key: 4, short: "V", long: "Venerdì" },
  { key: 5, short: "S", long: "Sabato" },
  { key: 6, short: "D", long: "Domenica" },
];

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4];
export const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export const TONES: Tone[] = [
  { id: "radar", name: "Radar" },
  { id: "alba", name: "Alba" },
  { id: "onde", name: "Onde" },
  { id: "campane", name: "Campane" },
  { id: "energia", name: "Energia" },
  { id: "classico", name: "Classico" },
];

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; objects: number; description: string }
> = {
  easy: { label: "Facile", objects: 1, description: "1 oggetto da fotografare" },
  medium: { label: "Media", objects: 2, description: "2 oggetti da fotografare" },
  hard: { label: "Difficile", objects: 3, description: "3 oggetti da fotografare" },
};

// Oggetti con emoji abbinata
export const CHALLENGE_OBJECTS_WITH_EMOJI: { name: string; emoji: string }[] = [
  { name: "una tazza", emoji: "☕" },
  { name: "un libro", emoji: "📚" },
  { name: "le chiavi", emoji: "🗝️" },
  { name: "uno spazzolino da denti", emoji: "🪥" },
  { name: "un cucchiaio", emoji: "🥄" },
  { name: "una bottiglia d'acqua", emoji: "🍶" },
  { name: "un paio di scarpe", emoji: "👟" },
  { name: "un telecomando", emoji: "📺" },
  { name: "una pianta", emoji: "🌿" },
  { name: "un calzino", emoji: "🧦" },
  { name: "un asciugamano", emoji: "🛁" },
  { name: "una forchetta", emoji: "🍴" },
  { name: "un bicchiere", emoji: "🥛" },
  { name: "un rotolo di carta igienica", emoji: "🧻" },
  { name: "una padella", emoji: "🍳" },
  { name: "un portafoglio", emoji: "👜" },
  { name: "una penna", emoji: "🖊️" },
  { name: "un orologio da polso", emoji: "⌚" },
  { name: "un cuscino", emoji: "🛏️" },
  { name: "un paio di occhiali", emoji: "👓" },
  { name: "uno zaino", emoji: "🎒" },
  { name: "un telefono", emoji: "📱" },
  { name: "una candela", emoji: "🕯️" },
  { name: "un ombrello", emoji: "☂️" },
  { name: "una matita", emoji: "✏️" },
  { name: "un giornale", emoji: "📰" },
  { name: "una tazza da tè", emoji: "🍵" },
  { name: "un coltello da cucina", emoji: "🔪" },
  { name: "un quaderno", emoji: "📓" },
  { name: "una borsetta", emoji: "👛" },
];

// Map nome → emoji per lookup rapido nella ChallengeScreen
export const OBJECT_EMOJI: Record<string, string> = Object.fromEntries(
  CHALLENGE_OBJECTS_WITH_EMOJI.map(({ name, emoji }) => [name, emoji])
);

export const CHALLENGE_OBJECTS: string[] = CHALLENGE_OBJECTS_WITH_EMOJI.map(
  ({ name }) => name
);

export function pickRandomObjects(count: number): string[] {
  const pool = [...CHALLENGE_OBJECTS];
  const out: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function toneName(id: string): string {
  return TONES.find((t) => t.id === id)?.name ?? "Radar";
}
