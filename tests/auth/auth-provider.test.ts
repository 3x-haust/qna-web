import { describe, expect, it } from "vitest";

import { postLoginDestination } from "@/auth/auth-provider";

describe("post-login navigation", () => {
  it("keeps a student on the joined session route", () => {
    expect(postLoginDestination("/join")).toBeNull();
  });

  it("sends regular login entry points to home", () => {
    expect(postLoginDestination("/")).toBe("/home");
  });
});
