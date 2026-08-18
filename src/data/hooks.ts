import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { endeavourRepository } from "./repositories/EndeavourRepository";
import { snapshotRepository } from "./repositories/SnapshotRepository";

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

/** Every endeavour with its latest Snapshot attached (Home). */
export function useEndeavoursWithLatestSnapshot() {
  return useLiveQuery(() => endeavourRepository.getAllWithLatestSnapshot(), []) ?? [];
}

/** A single endeavour with its latest Snapshot attached. */
export function useEndeavourWithLatestSnapshot(id: string) {
  return (
    useLiveQuery(async () => {
      const endeavour = await db.endeavours.get(id);
      if (!endeavour) {
        return null;
      }
      const latestSnapshot = await snapshotRepository.getLatestForEndeavour(id);
      return { ...endeavour, latestSnapshot };
    }, [id]) ?? null
  );
}

/** All Snapshots for an endeavour's given segment. */
export function useSnapshotsForSegment(endeavourId: string, segmentStartDate: string) {
  return (
    useLiveQuery(
      () => snapshotRepository.getBySegment(endeavourId, segmentStartDate),
      [endeavourId, segmentStartDate],
    ) ?? []
  );
}

/** All endeavours currently in the given domain. */
export function useDomainEndeavours(domainId: string) {
  return useLiveQuery(() => endeavourRepository.getByDomain(domainId), [domainId]) ?? [];
}
