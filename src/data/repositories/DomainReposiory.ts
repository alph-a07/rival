import type { Domain } from "@/domain/models/Domain";
import { db } from "@/data/db";

export const DomainRepository = {
  async create(domain: Domain): Promise<string> {
    return db.domains.add(domain);
  },

  async get(id: string): Promise<Domain | undefined> {
    return db.domains.get(id);
  },

  async update(id: string, updates: Partial<Domain>): Promise<number> {
    if (updates.gisMap) {
      const dbUpdates: Partial<Domain> = {
        ...updates,
        gisMap: Object.fromEntries(Object.entries(updates.gisMap)),
      };
      return db.domains.update(id, dbUpdates);
    }
    return db.domains.update(id, updates as Partial<Domain>);
  },
};
