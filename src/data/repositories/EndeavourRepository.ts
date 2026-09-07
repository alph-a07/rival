import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import { endeavourToRow, rowToEndeavour } from "@/data/schema/EndeavourRow";
import type { Endeavour } from "@/domain/models/Endeavour";
import { activeSegment } from "@/domain/models/Endeavour";
import type { Snapshot } from "@/domain/models/Snapshot";
import type { SnapshotRepository } from "./SnapshotRepository";
import { snapshotRepository as defaultSnapshotRepository } from "./SnapshotRepository";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import { DomainRegistry } from "@/domain/domains/domainDefinitions";
import { crossTabBus } from "@/core/runtime/crossTab";

/** An Endeavour with its most recent Snapshot attached (or null if none exists). */
export type EndeavourWithLatestSnapshot = Endeavour & {
  latestSnapshot: Snapshot | null;
};

/** Data-access surface for endeavour rows. A handle, not a class: injectable. */
export interface EndeavourRepository {
  create(endeavour: Endeavour): Promise<Result<string>>;
  get(id: string): Promise<Result<Endeavour | undefined>>;
  getAll(): Promise<Result<Endeavour[]>>;
  count(): Promise<Result<number>>;
  update(id: string, updates: Partial<Endeavour>): Promise<Result<number>>;
  saveEdits(id: string, updates: { name?: string; newDomainId?: string }): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  getAllWithLatestSnapshot(): Promise<Result<EndeavourWithLatestSnapshot[]>>;
  getByDomain(domainId: string): Promise<Result<Endeavour[]>>;
  switchDomain(endeavourId: string, newDomainId: string): Promise<Result<void>>;
  close(endeavourId: string): Promise<Result<void>>;
  reopen(endeavourId: string): Promise<Result<void>>;
}

/**
 * Creates an endeavour repository against a Dexie database with an injected
 * snapshot repository for the latest-snapshot reads.
 */
export function createEndeavourRepository(
  db: AppDatabase = defaultDb,
  snapshots: SnapshotRepository = defaultSnapshotRepository,
): EndeavourRepository {
  async function updateActiveHistory(
    endeavourId: string,
    buildHistory: (endeavour: Endeavour, now: string) => Endeavour["domainHistory"],
  ): Promise<Result<void>> {
    try {
      await db.transaction("rw", db.endeavours, async () => {
        const row = await db.endeavours.get(endeavourId);
        if (!row) {
          throw ErrorClassifier.notFound("endeavour", endeavourId);
        }
        const endeavour = rowToEndeavour(row);
        await db.endeavours.update(endeavourId, {
          domainHistory: endeavourToRow({
            ...endeavour,
            domainHistory: buildHistory(endeavour, new Date().toISOString()),
          }).domainHistory,
        });
      });
      crossTabBus.post("app:data-changed", { changedAt: Date.now() });
      return Ok(undefined);
    } catch (e) {
      return e && typeof e === "object" && "kind" in e
        ? Err(e as ReturnType<typeof ErrorClassifier.notFound>)
        : Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id: endeavourId }));
    }
  }

  return {
    async create(endeavour) {
      try {
        return Ok(await db.endeavours.add(endeavourToRow(endeavour)));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour" }));
      }
    },

    async get(id) {
      try {
        const row = await db.endeavours.get(id);
        return Ok(row ? rowToEndeavour(row) : undefined);
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id }));
      }
    },

    async getAll() {
      try {
        const rows = await db.endeavours.toArray();
        return Ok(rows.map(rowToEndeavour));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", op: "getAll" }));
      }
    },

    async count() {
      try {
        return Ok(await db.endeavours.count());
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", op: "count" }));
      }
    },

    async update(id, updates) {
      try {
        return Ok(await db.endeavours.update(id, updates));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id }));
      }
    },

    async saveEdits(id, updates) {
      if (updates.newDomainId && !DomainRegistry.all().some((d) => d.id === updates.newDomainId)) {
        return Err(ErrorClassifier.validation(`Unknown domain: ${updates.newDomainId}`));
      }
      try {
        await db.transaction("rw", db.endeavours, async () => {
          const endeavour = await db.endeavours.get(id);
          if (!endeavour) {
            throw ErrorClassifier.notFound("endeavour", id);
          }
          const next: Partial<Endeavour> = {};
          if (updates.name !== undefined) {
            next.name = updates.name;
          }
          if (updates.newDomainId) {
            const now = new Date().toISOString();
            const history = endeavour.domainHistory.map((segment) =>
              segment.endDate === null ? { ...segment, endDate: now } : segment,
            );
            history.push({
              domainId: updates.newDomainId,
              startDate: now,
              endDate: null,
              attachedGis: {},
            });
            next.domainHistory = history;
          }
          await db.endeavours.update(id, next);
        });
        crossTabBus.post("app:data-changed", { changedAt: Date.now() });
        return Ok(undefined);
      } catch (e) {
        return e && typeof e === "object" && "kind" in e
          ? Err(e as ReturnType<typeof ErrorClassifier.notFound>)
          : Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id, op: "saveEdits" }));
      }
    },

    async delete(id) {
      try {
        await db.transaction("rw", db.endeavours, db.checkIns, db.snapshots, async () => {
          await db.checkIns.where({ endeavourId: id }).delete();
          await db.snapshots.where({ endeavourId: id }).delete();
          await db.endeavours.delete(id);
        });
        crossTabBus.post("app:data-changed", { changedAt: Date.now() });
        return Ok(undefined);
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id }));
      }
    },

    async getAllWithLatestSnapshot() {
      try {
        const latest = await snapshots.getLatestPerEndeavour();
        if (!latest.ok) {
          return latest;
        }
        const [endeavours, latestByEndeavour] = await Promise.all([
          db.endeavours.toArray(),
          latest.value,
        ]);
        return Ok(
          endeavours.map((endeavour) => ({
            ...endeavour,
            latestSnapshot: latestByEndeavour.get(endeavour.id) ?? null,
          })),
        );
      } catch (e) {
        return Err(
          ErrorClassifier.fromDexieError(e, {
            entity: "Endeavour",
            op: "getAllWithLatestSnapshot",
          }),
        );
      }
    },

    async getByDomain(domainId) {
      try {
        const endeavours = await db.endeavours.toArray();
        return Ok(endeavours.filter((e) => activeSegment(e)?.domainId === domainId));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", domainId }));
      }
    },

    async switchDomain(endeavourId, newDomainId) {
      if (!DomainRegistry.all().some((d) => d.id === newDomainId)) {
        return Err(ErrorClassifier.validation(`Unknown domain: ${newDomainId}`));
      }
      try {
        await db.transaction("rw", db.endeavours, async () => {
          const endeavour = await db.endeavours.get(endeavourId);
          if (!endeavour) {
            throw ErrorClassifier.notFound("endeavour", endeavourId);
          }
          const now = new Date().toISOString();
          const history = endeavour.domainHistory.map((segment) =>
            segment.endDate === null ? { ...segment, endDate: now } : segment,
          );
          history.push({ domainId: newDomainId, startDate: now, endDate: null, attachedGis: {} });
          await db.endeavours.update(endeavourId, { domainHistory: history });
        });
        crossTabBus.post("app:data-changed", { changedAt: Date.now() });
        return Ok(undefined);
      } catch (e) {
        return e && typeof e === "object" && "kind" in e
          ? Err(e as ReturnType<typeof ErrorClassifier.notFound>)
          : Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id: endeavourId }));
      }
    },

    async close(endeavourId) {
      return updateActiveHistory(endeavourId, (endeavour, now) => {
        if (!activeSegment(endeavour)) {
          throw ErrorClassifier.validation("The endeavour has no active segment to close.");
        }
        return endeavour.domainHistory.map((segment) =>
          segment.endDate === null ? { ...segment, endDate: now } : segment,
        );
      });
    },

    async reopen(endeavourId) {
      return updateActiveHistory(endeavourId, (endeavour, now) => {
        if (activeSegment(endeavour)) {
          throw ErrorClassifier.validation("The endeavour is already active.");
        }
        const domainId = endeavour.domainHistory.at(-1)?.domainId ?? "exploring";
        if (!DomainRegistry.all().some((d) => d.id === domainId)) {
          throw ErrorClassifier.validation(`Unknown domain: ${domainId}`);
        }
        return [
          ...endeavour.domainHistory,
          { domainId, startDate: now, endDate: null, attachedGis: {} },
        ];
      });
    },
  };
}

/** App-wide singleton instance backing the hooks/UI path. */
export const endeavourRepository: EndeavourRepository = createEndeavourRepository();
