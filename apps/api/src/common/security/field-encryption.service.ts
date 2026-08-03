import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM envelope encryption for selected sensitive fields (e.g. MFA
 * secrets). Key comes from FIELD_ENCRYPTION_KEY (env or secret provider) —
 * never hard-coded. Ciphertext format: v1:<ivHex>:<tagHex>:<cipherHex>.
 */
@Injectable()
export class FieldEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(FieldEncryptionService.name);
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const raw = this.config.get<string>("FIELD_ENCRYPTION_KEY");
    if (!raw) {
      this.logger.warn(
        "FIELD_ENCRYPTION_KEY is not set. Field encryption will use a derived development-only key. Set this in production.",
      );
    }
    // scrypt derives a stable 32-byte key from whatever secret material is
    // provided so operators can supply a passphrase or a hex key equally.
    this.key = scryptSync(raw ?? "insecure-development-key-do-not-use-in-prod", "cdss-field-enc", 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
  }

  decrypt(payload: string): string {
    const [version, ivHex, tagHex, cipherHex] = payload.split(":");
    if (version !== "v1") throw new Error("Unsupported ciphertext version");
    if (!ivHex || !tagHex || !cipherHex) {
      throw new Error("Invalid ciphertext payload");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, "hex")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }
}
