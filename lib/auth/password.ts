import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const SCRYPT_KEY_LENGTH = 64;
const scryptAsync = promisify(scrypt);

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = ((await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer).toString(
    "hex",
  );

  return `scrypt:${salt}:${derivedKey}`;
};

export const verifyPassword = async (password: string, passwordHash: string) => {
  const [algorithm, salt, storedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(storedHash, "hex");

  if (derivedKey.byteLength !== storedKey.byteLength) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
};
