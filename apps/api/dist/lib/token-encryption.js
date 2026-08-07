"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
const node_crypto_1 = require("node:crypto");
// Encrypts OAuth refresh/access tokens before they're persisted to
// inbox_connections (docs/schema-details.md has no existing at-rest-secret
// precedent, but a long-lived Gmail refresh token in plaintext is a real
// credential-exposure risk if the DB is ever dumped/leaked). Format:
// base64(iv).base64(authTag).base64(ciphertext).
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
function getKey() {
    const raw = process.env.INBOX_TOKEN_ENCRYPTION_KEY;
    if (!raw) {
        throw new Error("INBOX_TOKEN_ENCRYPTION_KEY is not set");
    }
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
        throw new Error("INBOX_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
    }
    return key;
}
function encryptToken(plaintext) {
    const iv = (0, node_crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, node_crypto_1.createCipheriv)(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}
function decryptToken(encoded) {
    const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
        throw new Error("Malformed encrypted token");
    }
    const decipher = (0, node_crypto_1.createDecipheriv)(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextB64, "base64")),
        decipher.final(),
    ]);
    return plaintext.toString("utf8");
}
//# sourceMappingURL=token-encryption.js.map