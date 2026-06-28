export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Lunedì ... 6 = Domenica

export type Difficulty = "easy" | "medium" | "hard";

export interface Tone {
  id: string;
  name: string;
}

export interface Alarm {
  id: string;
  label: string;
  hour: number; // 0-23
  minute: number; // 0-59
  days: Weekday[]; // vuoto = una sola volta
  enabled: boolean;
  toneId: string;
  difficulty: Difficulty; // quanti oggetti da fotografare
}

export interface HistoryEntry {
  id: string;
  alarmId: string;
  label: string;
  dismissedAt: number; // timestamp
  objects: string[];
  attempts: number;
}
