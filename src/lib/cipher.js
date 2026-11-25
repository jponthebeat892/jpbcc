// JPBCC cipher engine - all encryption happens in the browser.
// The server only ever stores ciphertext, and the channel key is what turns it back
// into readable text, pictures, video, audio or documents.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PBKDF2_ITERATIONS = 120000;

export function toBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode.apply(null, view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function normalizeKey(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export async function deriveChannelKey(code, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(normalizeKey(code)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(String(salt)), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function fingerprintOf(code) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalizeKey(code)));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
    .toUpperCase();
  return hex.match(/.{4}/g).join(' ');
}

export async function encryptText(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  return { cipher: toBase64(buffer), iv: toBase64(iv) };
}

export async function decryptText(key, cipher, iv) {
  const buffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(cipher)
  );
  return decoder.decode(buffer);
}

export async function encryptBytes(key, arrayBuffer) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
  return { data: new Uint8Array(buffer), iv: toBase64(iv) };
}

export async function decryptBytes(key, arrayBuffer, iv) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, arrayBuffer);
}

export function kindFromFile(file) {
  const type = String(file?.type || '');
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'document';
}

// Downloaded attachments leave the terminal as an unreadable .jpbcc packet.
// It carries only what is needed to find the key again: the channel salt, the
// original name and type. The bytes stay encrypted.
export function packEncryptedFile({ conversationId, fileName, fileType, iv, data }) {
  const header = JSON.stringify({
    jp: 'JPBCC1',
    salt: conversationId,
    name: fileName,
    type: fileType,
    iv,
  });
  const headerBytes = encoder.encode(`${header}\n`);
  const out = new Uint8Array(headerBytes.length + data.length);
  out.set(headerBytes, 0);
  out.set(data, headerBytes.length);
  return out;
}

export async function unpackEncryptedFile(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const newline = bytes.indexOf(10);
  if (newline < 0) throw new Error('This file is not a JPBCC packet.');
  const header = JSON.parse(decoder.decode(bytes.subarray(0, newline)));
  if (header.jp !== 'JPBCC1') throw new Error('This file is not a JPBCC packet.');
  return { header, payload: bytes.subarray(newline + 1) };
}

export function previewOf(cipher, length = 44) {
  const raw = String(cipher || '');
  if (!raw) return 'awaiting first block';
  return raw.slice(0, length) + (raw.length > length ? '…' : '');
}