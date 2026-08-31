import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { Endeavour } from "@/domain/models/Endeavour";
import { activeSegment } from "@/domain/models/Endeavour";
import type { Snapshot } from "@/domain/models/Snapshot";
import { snapshotRepository as defaultSnapshotRepository } from "./SnapshotRepository";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import { DomainRegistry } from "@/domain/domains/domainDefinitions";

/** An Endeavour with its most recent Snapshot attached (or null if none exists). */
export type EndeavourWithLatestSnapshot = Endeavour & {
  latestSnapshot: Snapshot | null;
};

export class EndeavourRepository {
  private readonly db: AppDatabase;
  private readonly snapshots: typeof defaultSnapshotRepository;

  constructor(db: AppDatabase = defaultDb, snapshots = defaultSnapshotRepository) {
    this.db = db;
    this.snapshots = snapshots;
  }

  async create(endeavour: Endeavour): Promise<Result<string>> {
    try {
      return Ok(await this.db.endeavours.add(endeavour));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour" }));
    }
  }

  async get(id: string): Promise<Result<Endeavour | undefined>> {
    try {
      return Ok(await this.db.endeavours.get(id));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id }));
    }
  }

  async update(id: string, updates: Partial<Endeavour>): Promise<Result<number>> {
    try {
      return Ok(await this.db.endeavours.update(id, updates));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id }));
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.db.endeavours.delete(id);
      return Ok(undefined);
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", id }));
    }
  }

  /** All Endeavours, each with its most recent Snapshot attached. */
  async getAllWithLatestSnapshot(): Promise<Result<EndeavourWithLatestSnapshot[]>> {
    try {
      const latest = await this.snapshots.getLatestPerEndeavour();
      if (!latest.ok) {
        return latest;
      }
      const [endeavours, latestByEndeavour] = await Promise.all([
        this.db.endeavours.toArray(),
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
        ErrorClassifier.fromDexieError(e, { entity: "Endeavour", op: "getAllWithLatestSnapshot" }),
      );
    }
  }

  /** All Endeavours currently in the given domain. */
  async getByDomain(domainId: string): Promise<Result<Endeavour[]>> {
    try {
      const endeavours = await this.db.endeavours.toArray();
      return Ok(endeavours.filter((e) => activeSegment(e)?.domainId === domainId));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Endeavour", domainId }));
    }
  }

  /** Closes the current domain segment and opens a new one for the new domain. */
  async switchDomain(endeavourId: string, newDomainId: string): Promise<Result<void>> {
    const found = await this.get(endeavourId);
    if (!found.ok) {
      return found;
    }
    const endeavour = found.value;
    if (!endeavour) {
      return Err(ErrorClassifier.notFound("endeavour", endeavourId));
    }

    if (!DomainRegistry.all().some((d) => d.id === newDomainId)) {
      return Err(ErrorClassifier.validation(`Unknown domain: ${newDomainId}`));
    }

    const now = new Date().toISOString();
    const history = endeavour.domainHistory.map((segment) =>
      segment.endDate === null ? { ...segment, endDate: now } : segment,
    );

    history.push({
      domainId: newDomainId,
      startDate: now,
      endDate: null,
      attachedGis: {},
    });

    const result = await this.update(endeavourId, { domainHistory: history });
    return result.ok ? Ok(undefined) : result;
  }

  /** Ends the active segment without opening a new one, retiring the endeavour. */
  async close(endeavourId: string): Promise<Result<void>> {
    const found = await this.get(endeavourId);
    if (!found.ok) {
      return found;
    }
    const endeavour = found.value;
    if (!endeavour) {
      return Err(ErrorClassifier.notFound("endeavour", endeavourId));
    }
    if (!activeSegment(endeavour)) {
      return Err(ErrorClassifier.validation("The endeavour has no active segment to close."));
    }

    const now = new Date().toISOString();
    const history = endeavour.domainHistory.map((segment) =>
      segment.endDate === null ? { ...segment, endDate: now } : segment,
    );

    const result = await this.update(endeavourId, { domainHistory: history });
    return result.ok ? Ok(undefined) : result;
  }

  /** Re-opens a closed endeavour by starting a fresh active segment in the domain it last lived in. */
  async reopen(endeavourId: string): Promise<Result<void>> {
    const found = await this.get(endeavourId);
    if (!found.ok) {
      return found;
    }
    const endeavour = found.value;
    if (!endeavour) {
      return Err(ErrorClassifier.notFound("endeavour", endeavourId));
    }
    if (activeSegment(endeavour)) {
      return Err(ErrorClassifier.validation("The endeavour is already active."));
    }
    const lastSeg = endeavour.domainHistory.at(-1);
    const domainId = lastSeg?.domainId ?? "exploring";

    if (!DomainRegistry.all().some((d) => d.id === domainId)) {
      return Err(ErrorClassifier.validation(`Unknown domain: ${domainId}`));
    }

    const now = new Date().toISOString();
    const history = [
      ...endeavour.domainHistory,
      {
        domainId,
        startDate: now,
        endDate: null,
        attachedGis: {},
      },
    ];

    const result = await this.update(endeavourId, { domainHistory: history });
    return result.ok ? Ok(undefined) : result;
  }
}

/** App-wide singleton instance backing the hooks/UI path. */
export const endeavourRepository = new EndeavourRepository();
