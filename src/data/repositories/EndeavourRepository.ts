import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { Endeavour } from "@/domain/models/Endeavour";
import { activeSegment } from "@/domain/models/Endeavour";
import type { Snapshot } from "@/domain/models/Snapshot";
import { SnapshotRepository } from "./SnapshotRepository";

/** An Endeavour with its most recent Snapshot attached (or null if none exists). */
export type EndeavourWithLatestSnapshot = Endeavour & {
  latestSnapshot: Snapshot | null;
};

export class EndeavourRepository {
  private readonly db: AppDatabase;
  private readonly snapshots: SnapshotRepository;

  constructor(
    db: AppDatabase = defaultDb,
    snapshots: SnapshotRepository = new SnapshotRepository(defaultDb),
  ) {
    this.db = db;
    this.snapshots = snapshots;
  }

  async create(endeavour: Endeavour): Promise<string> {
    return this.db.endeavours.add(endeavour);
  }

  async get(id: string): Promise<Endeavour | undefined> {
    return this.db.endeavours.get(id);
  }

  async update(id: string, updates: Partial<Endeavour>): Promise<number> {
    return this.db.endeavours.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    return this.db.endeavours.delete(id);
  }

  /** All Endeavours, each with its most recent Snapshot attached. */
  async getAllWithLatestSnapshot(): Promise<EndeavourWithLatestSnapshot[]> {
    const [endeavours, latestByEndeavour] = await Promise.all([
      this.db.endeavours.toArray(),
      this.snapshots.getLatestPerEndeavour(),
    ]);

    return endeavours.map((endeavour) => ({
      ...endeavour,
      latestSnapshot: latestByEndeavour.get(endeavour.id) ?? null,
    }));
  }

  /** All Endeavours currently in the given domain. */
  async getByDomain(domainId: string): Promise<Endeavour[]> {
    const endeavours = await this.db.endeavours.toArray();
    return endeavours.filter((e) => activeSegment(e)?.domainId === domainId);
  }

  /** Closes the current domain segment and opens a new one for the new domain. */
  async switchDomain(endeavourId: string, newDomainId: string): Promise<void> {
    const endeavour = await this.db.endeavours.get(endeavourId);
    if (!endeavour) {
      throw new Error(`switchDomain: endeavour ${endeavourId} not found`);
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

    await this.db.endeavours.update(endeavourId, { domainHistory: history });
  }
}

/** App-wide singleton instance backing the hooks/UI path. */
export const endeavourRepository = new EndeavourRepository();
