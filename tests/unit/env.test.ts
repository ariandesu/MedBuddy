import { describe, expect, it } from "vitest";
import {
  getMongoUri,
  getModelApiKey,
  getMongoDb,
  getMuseModel,
  getMuseBaseUrl,
  isDemoDataMode,
  isDemoAiMode,
} from "@/server/env";

describe("env getters (M1)", () => {
  it("never throw and return undefined when env is empty (setup deletes secrets)", () => {
    expect(() => getMongoUri()).not.toThrow();
    expect(() => getModelApiKey()).not.toThrow();
    expect(getMongoUri()).toBeUndefined();
    expect(getModelApiKey()).toBeUndefined();
  });

  it("report demo modes when no credentials", () => {
    expect(isDemoDataMode()).toBe(true);
    expect(isDemoAiMode()).toBe(true);
  });

  it("return safe defaults for optional config", () => {
    expect(getMongoDb()).toBe("medisathi");
    expect(getMuseModel()).toBe("muse-spark-1.3");
    expect(getMuseBaseUrl()).toBe("https://api.meta.ai/v1");
  });
});
