import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { formatReading, latestReadings, readingInputSchema } from "@/lib/schemas";
import { MemoryRepository } from "@/server/repo/memory";
import { _setRepoForTests } from "@/server/repo/index";
import { GET, POST } from "@/app/api/readings/route";
import { DELETE } from "@/app/api/readings/[id]/route";

vi.mock("@/server/auth", () => ({
  getSessionUser: async () => ({ id: "user_me", email: "me@example.test" }),
}));

const valid = (r: unknown) => readingInputSchema.safeParse(r).success;
const post = (body: unknown) =>
  POST(new NextRequest("http://x/api/readings", { method: "POST", body: JSON.stringify(body) }));

describe("reading limits", () => {
  it("accepts what a home device could show, including worrying values", () => {
    expect(valid({ kind: "blood_pressure", value: 120, value2: 80 })).toBe(true);
    expect(valid({ kind: "blood_pressure", value: 190, value2: 120 })).toBe(true);
    expect(valid({ kind: "oxygen", value: 82 })).toBe(true);
    expect(valid({ kind: "temperature", value: 103.5 })).toBe(true);
    expect(valid({ kind: "weight", value: 61.5 })).toBe(true);
  });

  it("rejects impossible values and typing mistakes", () => {
    expect(valid({ kind: "blood_pressure", value: 80, value2: 120 })).toBe(false);
    expect(valid({ kind: "blood_pressure", value: 120 })).toBe(false);
    expect(valid({ kind: "oxygen", value: 101 })).toBe(false);
    expect(valid({ kind: "pulse", value: 72.5 })).toBe(false);
    expect(valid({ kind: "temperature", value: 37 })).toBe(false);
    expect(valid({ kind: "pulse", value: Number.NaN })).toBe(false);
    expect(valid({ kind: "pulse", value: 72, value2: 80 })).toBe(false);
  });
});

describe("latestReadings", () => {
  it("keeps the newest of each kind, in display order, and invents none", () => {
    const latest = latestReadings([
      { date: "2026-11-01", kind: "weight" as const, value: 60 },
      { date: "2026-11-03", kind: "weight" as const, value: 61 },
      { date: "2026-10-01", kind: "pulse" as const, value: 70 },
    ]);
    expect(latest.map((r) => [r.kind, r.value])).toEqual([["pulse", 70], ["weight", 61]]);
  });
});

describe("formatReading", () => {
  it("shows blood pressure as two numbers", () => {
    expect(formatReading({ value: 120, value2: 80 }, (s) => s)).toBe("120/80");
    expect(formatReading({ value: 98.6 }, (s) => s)).toBe("98.6");
  });
});

describe("/api/readings", () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    _setRepoForTests(repo);
  });

  it("saves all the readings or none", async () => {
    const bad = await post({
      date: "2026-11-01",
      readings: [{ kind: "pulse", value: 72 }, { kind: "oxygen", value: 140 }],
    });
    expect(bad.status).toBe(400);
    expect(await repo.listDeviceReadings("user_me")).toHaveLength(0);

    const good = await post({ date: "2026-11-01", readings: [{ kind: "pulse", value: 72 }] });
    expect(good.status).toBe(201);
    expect(await repo.listDeviceReadings("user_me")).toHaveLength(1);
  });

  it("doesn't count as a check-in", async () => {
    await post({ date: "2026-11-01", readings: [{ kind: "pulse", value: 72 }] });
    expect(await repo.listWellnessEntries("user_me", "2026-11-01", "2026-11-01")).toHaveLength(0);
  });

  it("refuses a far-future date", async () => {
    expect((await post({ date: "2099-01-01", readings: [{ kind: "pulse", value: 72 }] })).status).toBe(400);
  });

  it("only returns and removes the person's own readings", async () => {
    const theirs = await repo.upsertDeviceReading("user_other", "2026-11-01", { kind: "pulse", value: 90 });
    const res = await GET(new NextRequest("http://x/api/readings?from=2026-01-01&to=2026-12-31"));
    expect((await res.json()).readings).toEqual([]);
    const del = await DELETE(new NextRequest("http://x"), { params: Promise.resolve({ id: theirs.id }) });
    expect(del.status).toBe(404);
    expect(await repo.listDeviceReadings("user_other")).toHaveLength(1);
  });
});
