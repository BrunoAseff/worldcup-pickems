import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");

  return `scrypt:${salt}:${derivedKey}`;
};

export const verifyPassword = (password: string, passwordHash: string) => {
  const [algorithm, salt, storedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const storedKey = Buffer.from(storedHash, "hex");

  if (derivedKey.byteLength !== storedKey.byteLength) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
};
