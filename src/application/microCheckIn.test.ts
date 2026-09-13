import { describe, expect, test, vi } from "vitest";
import type { MicroCheckInRepository } from "@/data/repositories/MicroCheckInRepository";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import { createMicroCheckInCommands } from "./microCheckIn";

describe("createMicroCheckInCommands", () => {
  test("creates a micro check-in and marks the sync latch", async () => {
    const repository: MicroCheckInRepository = {
      create: vi.fn().mockResolvedValue({ ok: true as const, value: "micro-1" }),
      getForDay: vi.fn(),
      getRecent: vi.fn(),
      loggedToday: vi.fn(),
    };
    const markLocalDataChanged = vi.fn().mockResolvedValue(undefined);
    const commands = createMicroCheckInCommands({
      repository,
      markLocalDataChanged,
    });

    const result = await commands.logToday("good", "2024-01-01T00:00:00.000Z");

    expect(result).toEqual({ ok: true, value: "micro-1" });
    expect(repository.create).toHaveBeenCalledWith("good", "2024-01-01T00:00:00.000Z");
    expect(markLocalDataChanged).toHaveBeenCalledOnce();
  });

  test("does not mark the latch when the repository rejects the mood", async () => {
    const repository: MicroCheckInRepository = {
      create: vi.fn().mockResolvedValue({
        ok: false as const,
        error: ErrorClassifier.validation("already logged"),
      }),
      getForDay: vi.fn(),
      getRecent: vi.fn(),
      loggedToday: vi.fn(),
    };
    const markLocalDataChanged = vi.fn().mockResolvedValue(undefined);
    const commands = createMicroCheckInCommands({ repository, markLocalDataChanged });

    const result = await commands.logToday("okay");

    expect(result.ok).toBe(false);
    expect(markLocalDataChanged).not.toHaveBeenCalled();
  });

  test("does not fail the mood log when the latch write fails", async () => {
    const repository: MicroCheckInRepository = {
      create: vi.fn().mockResolvedValue({ ok: true as const, value: "micro-1" }),
      getForDay: vi.fn(),
      getRecent: vi.fn(),
      loggedToday: vi.fn(),
    };
    const commands = createMicroCheckInCommands({
      repository,
      markLocalDataChanged: vi.fn().mockRejectedValue(new Error("latch storage down")),
    });

    const result = await commands.logToday("great");

    expect(result).toEqual({ ok: true, value: "micro-1" });
  });
});
