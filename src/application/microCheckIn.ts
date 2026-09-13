import type { Result } from "@/domain/errors/Result";
import type { AppError } from "@/domain/errors/AppError";
import type { MicroMood } from "@/domain/models/MicroMood";
import type { MicroCheckInRepository } from "@/data/repositories/MicroCheckInRepository";
import { microCheckInRepository } from "@/data/repositories/MicroCheckInRepository";
import { pendingSyncStore } from "@/sync/pendingSync";
import { markLocalDataChanged, type BaseCommandEnv } from "./command";

/** Defines the user-facing micro check-in(daily mood logging) commands.*/
export interface MicroCheckInCommands {
  logToday(mood: MicroMood, now?: string): Promise<Result<string, AppError>>;
}

/** Creates the micro check-in application commands for an injected data/sync env. */
export function createMicroCheckInCommands(env: MicroCheckInCommandEnv): MicroCheckInCommands {
  return {
    async logToday(mood, now) {
      const result = await env.repository.create(mood, now);

      if (!result.ok) {
        return result;
      }

      await markLocalDataChanged(env);
      return result;
    },
  };
}

interface MicroCheckInCommandEnv extends BaseCommandEnv {
  repository: MicroCheckInRepository;
}

/** App-wide singleton backing the UI path. */
export const microCheckInCommands: MicroCheckInCommands = createMicroCheckInCommands({
  repository: microCheckInRepository,
  markLocalDataChanged: () => pendingSyncStore.markDirty(),
});
