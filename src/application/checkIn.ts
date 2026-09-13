import { Ok, Err, type Result } from "@/domain/errors/Result";
import type { AppError } from "@/domain/errors/AppError";
import type { CheckIn, CheckInResponse } from "@/domain/models/CheckIn";
import type { DomainSegment } from "@/domain/models/Endeavour";
import type { Gis, GisTier } from "@/domain/models/Gis";
import type { Snapshot } from "@/domain/models/Snapshot";
import { buildSnapshotFromCheckIn } from "@/domain/checkin/checkInProcessor";
import type { CheckInRepository } from "@/data/repositories/CheckInRepository";
import { checkInRepository } from "@/data/repositories/CheckInRepository";
import { pendingSyncStore } from "@/sync/pendingSync";
import {
  defaultMakeId,
  defaultMakeTimestamp,
  markLocalDataChanged,
  type BaseCommandEnv,
} from "./command";

/** The data-shaped inputs a completed check-in needs to be recorded. */
export interface NewCheckInInput {
  endeavourId: string;
  segment: DomainSegment;
  activeGis: Map<Gis, GisTier>;
  priorSnapshot: Snapshot | null;
  recentResiduals: Array<number | null>;
  responses: CheckInResponse[];
  occurredAt: string;
  /** Optional stable id; a fresh one is produced when omitted. */
  id?: string;
}

/** Defines the user-facing check-in commands. */
export interface CheckInCommands {
  /** Records a completed check-in. */
  recordCompletedCheckIn(input: NewCheckInInput): Promise<Result<Snapshot, AppError>>;
}

/** Creates the check-in application commands for an injected data/sync env. */
export function createCheckInCommands(env: CheckInCommandEnv): CheckInCommands {
  const makeId = env.makeId ?? defaultMakeId;

  return {
    async recordCompletedCheckIn(input) {
      const timestamp = (env.makeTimestamp ?? defaultMakeTimestamp)();

      const checkIn: CheckIn = {
        id: input.id ?? makeId(),
        endeavourId: input.endeavourId,
        timestamp: input.occurredAt ?? timestamp,
        responses: input.responses,
        rawScore: 0,
      };

      const snapshot = buildSnapshotFromCheckIn(
        checkIn,
        input.segment,
        input.activeGis,
        input.priorSnapshot,
        input.recentResiduals,
      );

      const result = await env.repository.record(checkIn, snapshot);

      if (!result.ok) {
        return Err(result.error);
      }

      await markLocalDataChanged(env);

      return Ok(snapshot);
    },
  };
}

export interface CheckInCommandEnv extends BaseCommandEnv {
  repository: CheckInRepository;
}

/** App-wide singleton backing the UI path. */
export const checkInCommands: CheckInCommands = createCheckInCommands({
  repository: checkInRepository,
  markLocalDataChanged: () => pendingSyncStore.markDirty(),
});
