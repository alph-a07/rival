import { Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import type { GisTier } from "@/domain/models/Gis";
import type { AppError } from "@/domain/errors/AppError";
import type { Endeavour } from "@/domain/models/Endeavour";
import type { EndeavourRepository } from "@/data/repositories/EndeavourRepository";
import { endeavourRepository } from "@/data/repositories/EndeavourRepository";
import { pendingSyncStore } from "@/sync/pendingSync";
import {
  defaultMakeId,
  defaultMakeTimestamp,
  markLocalDataChanged,
  type BaseCommandEnv,
} from "./command";

/** A brand-new endeavour with the domain segment it starts in. */
export interface NewEndeavourData {
  id?: string;
  name: string;
  startedAt?: string;
  domainId: string;
  /** gisId -> tier for the methods attached to the new domain segment. */
  attachedGis: Record<string, GisTier>;
}

/** Defines the user-facing endeavour commands. */
export interface EndeavourCommands {
  create(data: NewEndeavourData): Promise<Result<string, AppError>>;
  saveEdits(endeavourId: string, edits: EndeavourEdits): Promise<Result<void, AppError>>;
  close(endeavourId: string): Promise<Result<void, AppError>>;
  reopen(endeavourId: string): Promise<Result<void, AppError>>;
  switchDomain(endeavourId: string, newDomainId: string): Promise<Result<void, AppError>>;
}

/** Creates the endeavour application commands for an injected env. */
export function createEndeavourCommands(env: EndeavourCommandEnv): EndeavourCommands {
  const makeId = env.makeId ?? defaultMakeId;
  const stamp = env.makeTimestamp ?? defaultMakeTimestamp;

  const mark = async (result: Result<unknown, AppError>): Promise<Result<unknown, AppError>> => {
    if (!result.ok) {
      return result;
    }

    await markLocalDataChanged(env);
    return result;
  };

  return {
    async create(data) {
      if (!data.name.trim()) {
        return Err(ErrorClassifier.validation("Give your endeavour a name."));
      }

      const domainHistory: Endeavour["domainHistory"] = [
        {
          domainId: data.domainId,
          startDate: data.startedAt ?? stamp(),
          endDate: null,
          attachedGis: data.attachedGis,
        },
      ];

      const created = await env.repository.create({
        id: data.id ?? makeId(),
        name: data.name.trim(),
        domainHistory,
      });

      return (await mark(created)) as Result<string, AppError>;
    },

    async saveEdits(id, edits) {
      const result = await env.repository.saveEdits(id, edits);
      return (await mark(result)) as Result<void, AppError>;
    },

    async close(id) {
      const result = await env.repository.close(id);
      return (await mark(result)) as Result<void, AppError>;
    },

    async reopen(id) {
      const result = await env.repository.reopen(id);
      return (await mark(result)) as Result<void, AppError>;
    },

    async switchDomain(id, newDomainId) {
      const result = await env.repository.switchDomain(id, newDomainId);
      return (await mark(result)) as Result<void, AppError>;
    },
  };
}

/** Edits a user can save in one screen action: rename + optional domain re-home. */
export interface EndeavourEdits {
  name?: string;
  newDomainId?: string;
}

export interface EndeavourCommandEnv extends BaseCommandEnv {
  repository: EndeavourRepository;
}

/** App-wide singleton backing the UI path. */
export const endeavourCommands: EndeavourCommands = createEndeavourCommands({
  repository: endeavourRepository,
  markLocalDataChanged: () => pendingSyncStore.markDirty(),
});
