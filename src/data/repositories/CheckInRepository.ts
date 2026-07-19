import type { CheckIn } from "@/domain/models/CheckIn";
import { db } from "@/data/db";

export const CheckInRepository = {
  async create(checkIn: CheckIn): Promise<string> {
    return db.checkIns.add(checkIn);
  },

  async get(id: string): Promise<CheckIn | undefined> {
    return db.checkIns.get(id);
  },

  async getByEndeavour(endeavourId: string): Promise<CheckIn[]> {
    return db.checkIns.where({ endeavourId }).sortBy("timestamp");
  },

  async delete(id: string): Promise<void> {
    return db.checkIns.delete(id);
  },
};
