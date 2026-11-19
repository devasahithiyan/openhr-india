import { describe, it, expect } from "vitest";
import {
  Vault,
  hashPassword,
  verifyPassword,
  tokenHash,
  mask,
} from "./security";
describe("private data protection", () => {
  it("uses random authenticated encryption bound to company/employee/field", () => {
    const vault = new Vault("a".repeat(64));
    const a = vault.encrypt("TESTP0000A", "company:employee:pan");
    const b = vault.encrypt("TESTP0000A", "company:employee:pan");
    expect(a).not.toBe(b);
    expect(a).not.toContain("TESTP0000A");
    expect(vault.decrypt(a, "company:employee:pan")).toBe("TESTP0000A");
    expect(() => vault.decrypt(a, "other:employee:pan")).toThrow();
    expect(() => new Vault("bad")).toThrow();
    const parts = a.split(".");
    parts[2] = Buffer.alloc(16).toString("base64");
    expect(() =>
      vault.decrypt(parts.join("."), "company:employee:pan"),
    ).toThrow();
  });
  it("hashes passwords and rejects a different password", async () => {
    const hash = await hashPassword("Demo-only-1234");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "Demo-only-1234")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });
  it("masks identifiers and hashes session tokens", () => {
    expect(mask("000000000000")).toBe("••••0000");
    expect(mask(null)).toBeNull();
    expect(tokenHash("example")).toHaveLength(64);
    expect(tokenHash("example")).not.toContain("example");
  });
});
