import { randomBytes } from "crypto";

export function uid(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}
