import { describe, expect, it } from "vitest";
import { groundSummaryChanges } from "@/server/ai/grounding";

describe("groundSummaryChanges (T8)", () => {
  it("drops ungrounded claims and adds limitation note", () => {
    const allowed = new Set(["rec_a", "rec_b"]);
    const changes = [
      {
        description: "valid claim",
        sourceRecordIds: ["rec_a"],
        uncertainty: "none",
      },
      {
        description: "unknown id claim",
        sourceRecordIds: ["rec_unknown"],
        uncertainty: "none",
      },
      {
        description: "empty sources claim",
        sourceRecordIds: [],
        uncertainty: "none",
      },
    ];

    const result = groundSummaryChanges(
      changes as { description: string; sourceRecordIds: string[]; uncertainty: string }[],
      allowed
    );
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].description).toBe("valid claim");
    expect(result.limitationNote).not.toBeNull();
    expect(result.limitationNote!).toContain("2");
  });
});
