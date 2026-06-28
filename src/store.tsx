import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alarm, HistoryEntry, Weekday } from "./types";
import {
  loadAlarms,
  saveAlarms,
  loadHistory,
  saveHistory,
  loadSubscribed,
  saveSubscribed,
  loadOnboarded,
  saveOnboarded,
} from "./storage";
import { DIFFICULTY_META, pickRandomObjects } from "./constants";
import { jsDayToWeekday } from "./time";

interface RingingState {
  alarm: Alarm;
  objects: string[];
}

interface StoreValue {
  ready: boolean;
  alarms: Alarm[];
  history: HistoryEntry[];
  subscribed: boolean;
  onboarded: boolean;
  ringing: RingingState | null;

  addAlarm: (a: Alarm) => void;
  updateAlarm: (a: Alarm) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string, enabled: boolean) => void;

  startRinging: (alarm: Alarm) => void;
  dismissRinging: (attempts: number) => void;
  cancelRinging: () => void;

  setSubscribed: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

function seedAlarms(): Alarm[] {
  return [
    {
      id: "seed-1",
      label: "Lavoro",
      hour: 7,
      minute: 0,
      days: [0, 1, 2, 3, 4],
      enabled: true,
      toneId: "radar",
      difficulty: "medium",
    },
    {
      id: "seed-2",
      label: "Palestra",
      hour: 6,
      minute: 30,
      days: [0, 2, 4],
      enabled: false,
      toneId: "energia",
      difficulty: "hard",
    },
    {
      id: "seed-3",
      label: "Weekend",
      hour: 9,
      minute: 15,
      days: [5, 6],
      enabled: true,
      toneId: "alba",
      difficulty: "easy",
    },
  ];
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [subscribed, setSubscribedState] = useState(false);
  const [onboarded, setOnboardedState] = useState(false);
  const [ringing, setRinging] = useState<RingingState | null>(null);
  const firstLoad = useRef(false);

  useEffect(() => {
    (async () => {
      const [a, h, s, o] = await Promise.all([
        loadAlarms(),
        loadHistory(),
        loadSubscribed(),
        loadOnboarded(),
      ]);
      // alla primissima apertura semina sveglie d'esempio
      if (a.length === 0 && !o) {
        const seeded = seedAlarms();
        setAlarms(seeded);
        saveAlarms(seeded);
      } else {
        setAlarms(a);
      }
      setHistory(h);
      setSubscribedState(s);
      setOnboardedState(o);
      firstLoad.current = true;
      setReady(true);
    })();
  }, []);

  const persistAlarms = useCallback((next: Alarm[]) => {
    setAlarms(next);
    saveAlarms(next);
  }, []);

  const addAlarm = useCallback(
    (a: Alarm) => persistAlarms([...alarmsRef.current, a]),
    []
  );
  const updateAlarm = useCallback(
    (a: Alarm) =>
      persistAlarms(alarmsRef.current.map((x) => (x.id === a.id ? a : x))),
    []
  );
  const deleteAlarm = useCallback(
    (id: string) => persistAlarms(alarmsRef.current.filter((x) => x.id !== id)),
    []
  );
  const toggleAlarm = useCallback(
    (id: string, enabled: boolean) =>
      persistAlarms(
        alarmsRef.current.map((x) => (x.id === id ? { ...x, enabled } : x))
      ),
    []
  );

  // ref sempre aggiornato per evitare closure stantie nei callback
  const alarmsRef = useRef<Alarm[]>([]);
  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  const startRinging = useCallback((alarm: Alarm) => {
    const count = DIFFICULTY_META[alarm.difficulty].objects;
    setRinging({ alarm, objects: pickRandomObjects(count) });
  }, []);

  const dismissRinging = useCallback((attempts: number) => {
    setRinging((cur) => {
      if (cur) {
        const entry: HistoryEntry = {
          id: `h-${Date.now()}`,
          alarmId: cur.alarm.id,
          label: cur.alarm.label || "Sveglia",
          dismissedAt: Date.now(),
          objects: cur.objects,
          attempts,
        };
        setHistory((h) => {
          const next = [entry, ...h].slice(0, 50);
          saveHistory(next);
          return next;
        });
        // sveglia "una volta": disattivala dopo lo spegnimento
        if (!cur.alarm.days || cur.alarm.days.length === 0) {
          setAlarms((prev) => {
            const next = prev.map((x) =>
              x.id === cur.alarm.id ? { ...x, enabled: false } : x
            );
            saveAlarms(next);
            return next;
          });
        }
      }
      return null;
    });
  }, []);

  const cancelRinging = useCallback(() => setRinging(null), []);

  const setSubscribed = useCallback((v: boolean) => {
    setSubscribedState(v);
    saveSubscribed(v);
  }, []);

  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    saveOnboarded(v);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      alarms,
      history,
      subscribed,
      onboarded,
      ringing,
      addAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      startRinging,
      dismissRinging,
      cancelRinging,
      setSubscribed,
      setOnboarded,
    }),
    [
      ready,
      alarms,
      history,
      subscribed,
      onboarded,
      ringing,
      addAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      startRinging,
      dismissRinging,
      cancelRinging,
      setSubscribed,
      setOnboarded,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function newAlarm(): Alarm {
  const now = new Date();
  return {
    id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label: "",
    hour: now.getHours(),
    minute: 0,
    days: [0, 1, 2, 3, 4],
    enabled: true,
    toneId: "radar",
    difficulty: "medium",
  };
}

export type { Weekday };
