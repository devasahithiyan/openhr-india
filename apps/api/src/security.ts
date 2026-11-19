import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import * as argon2 from "argon2";

export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
export const verifyPassword = (hash: string, password: string) =>
  argon2.verify(hash, password);
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
export class Vault {
  private readonly key: Buffer;
  constructor(key: string) {
    if (!/^[a-f0-9]{64}$/i.test(key))
      throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes encoded as hex");
    this.key = Buffer.from(key, "hex");
  }
  encrypt(value: string, context: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      body.toString("base64"),
    ].join(".");
  }
  decrypt(value: string, context: string): string {
    const [version, iv, tag, body] = value.split(".");
    if (version !== "v1" || !iv || !tag || !body)
      throw new Error("Invalid encrypted record");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64"),
    );
    cipher.setAAD(Buffer.from(context));
    cipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      cipher.update(Buffer.from(body, "base64")),
      cipher.final(),
    ]).toString("utf8");
  }
}
export const mask = (value: string | null) =>
  value ? `••••${value.slice(-4)}` : null;
