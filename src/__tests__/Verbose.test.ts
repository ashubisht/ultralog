import { Verbose } from "../lib/Verbose";

describe("Verbose", () => {
  it("prints empty when disabled", () => {
    const v = new Verbose();
    expect(v.print()).toBe("");
  });

  it("prints harsh info when enabled", () => {
    const v = new Verbose();
    v.enabled = true;
    const out = v.print();
    expect(out).toContain("PID:");
  });
});
