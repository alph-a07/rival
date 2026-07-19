import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export function useEndeavours() {
  return useLiveQuery(() => db.endeavours.toArray()) ?? [];
}

export function useEndeavour(id: string) {
  return useLiveQuery(() => db.endeavours.get(id), [id]);
}

export function useCheckIns(endeavourId?: string) {
  return (
    useLiveQuery(
      () =>
        endeavourId
          ? db.checkIns.where({ endeavourId }).reverse().sortBy("timestamp")
          : db.checkIns.reverse().sortBy("timestamp"),
      [endeavourId],
    ) ?? []
  );
}
