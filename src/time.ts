import { Alarm, Weekday } from "./types";
import { WEEKDAY_LABELS, WEEKDAYS, ALL_DAYS } from "./constants";

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

// JS getDay(): 0=Domenica..6=Sabato. Convertiamo al nostro 0=Lunedì..6=Domenica.
export function jsDayToWeekday(jsDay: number): Weekday {
  return ((jsDay + 6) % 7) as Weekday;
}

export function describeDays(days: Weekday[]): string {
  if (!days || days.length === 0) return "Una volta";
  if (days.length === 7) return "Tutti i giorni";
  const sorted = [...days].sort((a, b) => a - b);
  if (sameSet(sorted, WEEKDAYS)) return "Giorni feriali";
  if (sameSet(sorted, [5, 6])) return "Weekend";
  return sorted.map((d) => WEEKDAY_LABELS[d].long.slice(0, 3)).join(", ");
}

function sameSet(a: Weekday[], b: Weekday[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x) => b.includes(x));
}

// Quanto manca alla prossima attivazione, in minuti. null se disattivata o nessun giorno valido.
export function minutesUntilNext(alarm: Alarm, from: Date = new Date()): number | null {
  if (!alarm.enabled) return null;
  const now = new Date(from);
  const days = alarm.days && alarm.days.length > 0 ? alarm.days : null;

  for (let offset = 0; offset < 8; offset++) {
    const cand = new Date(now);
    cand.setDate(now.getDate() + offset);
    cand.setHours(alarm.hour, alarm.minute, 0, 0);
    if (cand.getTime() <= now.getTime()) continue;
    const wd = jsDayToWeekday(cand.getDay());
    if (days === null) {
      // una sola volta: il primo orario futuro valido
      return Math.round((cand.getTime() - now.getTime()) / 60000);
    }
    if (days.includes(wd)) {
      return Math.round((cand.getTime() - now.getTime()) / 60000);
    }
  }
  return null;
}

export function describeNext(alarm: Alarm, from: Date = new Date()): string {
  const mins = minutesUntilNext(alarm, from);
  if (mins === null) return "";
  if (mins < 60) return `tra ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) {
    return rem === 0 ? `tra ${hours} h` : `tra ${hours} h ${rem} min`;
  }
  const d = Math.floor(hours / 24);
  return `tra ${d} ${d === 1 ? "giorno" : "giorni"}`;
}

export { ALL_DAYS, WEEKDAYS };
