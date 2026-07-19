import { db } from "@/data/db";
import type { Endeavour } from "@/domain/models/Endeavour";

export const EndeavourRepository = {
  async create(endeavour: Endeavour): Promise<string> {
    return db.endeavours.add(endeavour);
  },

  async get(id: string): Promise<Endeavour | undefined> {
    return db.endeavours.get(id);
  },

  async update(id: string, updates: Partial<Endeavour>): Promise<number> {
    return db.endeavours.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    return db.endeavours.delete(id);
  },
};
