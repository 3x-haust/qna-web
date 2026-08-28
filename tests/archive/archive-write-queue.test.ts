import { describe, expect, it } from "vitest";

import { createArchiveWriteQueue } from "@/archive/archive-write-queue";

describe("archive write serialization", () => {
  it("does not start the next GitDB write before the current write settles", async () => {
    const enqueue = createArchiveWriteQueue();
    const firstGate = Promise.withResolvers<void>();
    const events: string[] = [];
    const first = enqueue(async () => {
      events.push("first:start");
      await firstGate.promise;
      events.push("first:end");
      return "first";
    });
    const second = enqueue(async () => {
      events.push("second:start");
      return "second";
    });

    await Promise.resolve();
    expect(events).toEqual(["first:start"]);
    firstGate.resolve();

    await expect(Promise.all([first, second])).resolves.toEqual([
      "first",
      "second",
    ]);
    expect(events).toEqual(["first:start", "first:end", "second:start"]);
  });
});
