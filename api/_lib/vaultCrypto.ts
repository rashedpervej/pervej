/**
 * Server-Side AES-256-GCM End-to-End Vault Cryptography for API Endpoints
 * Decrypts encrypted_ai_vault from Supabase in-memory at runtime.
 */

const VAULT_PEPPER =
  process.env.VAULT_PEPPER || "pervej_portfolio_aes256_gcm_vault_pepper_9921_alpha";
const VAULT_SALT =
  process.env.VAULT_SALT || "pervej_rashed_vault_salt_secure_2026";

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let cachedCryptoKey: CryptoKey | null = null;

async function getVaultDerivedKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not available in Node.js runtime.");
  }

  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    "raw",
    enc.encode(VAULT_PEPPER),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  cachedCryptoKey = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(VAULT_SALT),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return cachedCryptoKey;
}

export function isEncryptedVault(val: any): boolean {
  return typeof val === "string" && val.startsWith("enc:v1:");
}

export async function encryptVaultData(data: any): Promise<string> {
  if (data === null || data === undefined) return "";
  
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return typeof data === "string" ? data : JSON.stringify(data);

  try {
    const key = await getVaultDerivedKey();
    const enc = new TextEncoder();
    const plaintext = typeof data === "string" ? data : JSON.stringify(data);

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext)
    );

    return `enc:v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
  } catch (err) {
    console.error("[VaultCrypto Backend] Encryption failed:", err);
    throw err;
  }
}

export async function decryptVaultData<T = any>(ciphertext: string): Promise<T> {
  if (!ciphertext || typeof ciphertext !== "string") {
    return ciphertext as any;
  }

  if (!isEncryptedVault(ciphertext)) {
    try {
      return JSON.parse(ciphertext);
    } catch {
      return ciphertext as any;
    }
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted vault format");
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Crypto API unavailable for decryption");
  }

  try {
    const key = await getVaultDerivedKey();
    const iv = base64ToBytes(parts[2]);
    const data = base64ToBytes(parts[3]);

    const decrypted = await subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    const decryptedStr = new TextDecoder().decode(decrypted);
    try {
      return JSON.parse(decryptedStr);
    } catch {
      return decryptedStr as any;
    }
  } catch (err) {
    console.error("[VaultCrypto Backend] Decryption failed:", err);
    throw err;
  }
}
