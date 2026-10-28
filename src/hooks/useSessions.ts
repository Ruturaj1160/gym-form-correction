import { useCallback, useState } from "react";
import { listSessions, type SessionRecord } from "../storage/sessions";

export function useSessions(): {
  sessions: SessionRecord[];
  reload: () => void;
} {
  const [sessions, setSessions] = useState(listSessions);
  const reload = useCallback(() => setSessions(listSessions()), []);
  return { sessions, reload };
}
