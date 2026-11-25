import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeChannelKey() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const groups = [];
  for (let g = 0; g < 4; g += 1) {
    let part = '';
    for (let i = 0; i < 5; i += 1) {
      part += ALPHABET[bytes[g * 5 + i] % ALPHABET.length];
    }
    groups.push(part);
  }
  return `JP-${groups.join('-')}`;
}

function normalizeKey(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

async function fingerprintOf(code) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeKey(code)));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
    .toUpperCase();
  return hex.match(/.{4}/g).join(' ');
}

function emailBody({ handle, partner, code, fingerprint }) {
  return `
  <div style="background:#070b09;padding:28px;font-family:'JetBrains Mono',Courier,monospace;color:#d7e6dd">
    <p style="letter-spacing:4px;color:#3ddc97;margin:0 0 18px">JPBCC / SECURE COMM CHANNEL</p>
    <p style="margin:0 0 12px">Operator @${handle}, your channel with @${partner} is now open.</p>
    <p style="margin:0 0 6px;color:#7f9a8c;font-size:12px">LONG TERM CHANNEL KEY</p>
    <p style="margin:0 0 18px;font-size:22px;letter-spacing:3px;color:#ffffff;background:#101815;padding:14px 16px;border:1px solid #1f3128">${code}</p>
    <p style="margin:0 0 18px;color:#7f9a8c;font-size:12px">FINGERPRINT ${fingerprint}</p>
    <p style="margin:0 0 8px">Keep it safe. This key is the only way to turn ciphertext back into readable text,
    pictures, video and audio. Every block asks for it before it will decrypt, and files you download
    can only be opened with it.</p>
    <p style="margin:18px 0 0;color:#7f9a8c;font-size:12px">If you did not expect this channel, delete this email.</p>
  </div>`;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestId = typeof body?.request_id === 'string' ? body.request_id : '';
    if (!requestId) return Response.json({ error: 'A request id is required.' }, { status: 400 });

    const request = await base44.entities.Connection.get(requestId);
    if (!request || request.to_user_id !== user.id) {
      return Response.json({ error: 'This request is not addressed to you.' }, { status: 403 });
    }
    if (request.status === 'declined' || request.status === 'cancelled') {
      return Response.json({ error: 'This request is no longer open.' }, { status: 409 });
    }

    if (request.status === 'accepted' && request.conversation_id) {
      const existing = await base44.entities.Conversation.get(request.conversation_id);
      return Response.json({
        conversation_id: existing.id,
        key_code: existing.key_code,
        key_fingerprint: existing.key_fingerprint,
        reused: true,
      });
    }

    const keyCode = makeChannelKey();
    const fingerprint = await fingerprintOf(keyCode);
    const now = new Date().toISOString();

    const conversation = await base44.entities.Conversation.create({
      participants: [request.from_user_id, request.to_user_id],
      participant_handles: [request.from_username, request.to_username],
      key_code: keyCode,
      key_fingerprint: fingerprint,
      request_id: request.id,
      last_message_at: now,
      last_preview: '',
      message_count: 0,
    });

    await base44.entities.Connection.update(request.id, {
      status: 'accepted',
      conversation_id: conversation.id,
      responded_date: now,
    });

    const recipients = new Map();
    recipients.set(request.to_user_id, user.email);
    const aliases = await base44.asServiceRole.entities.LoginAlias.filter(
      { user_id: { $in: [request.from_user_id] } },
      { limit: 2, fields: ['user_id', 'email'] }
    );
    (aliases.items || []).forEach((alias) => recipients.set(alias.user_id, alias.email));

    const sends = [];
    recipients.forEach((email, userId) => {
      if (!email) return;
      const partnerHandle = userId === request.from_user_id ? request.to_username : request.from_username;
      const ownHandle = userId === request.from_user_id ? request.from_username : request.to_username;
      sends.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: 'Your JPBCC channel key',
          body: emailBody({
            handle: ownHandle || 'operator',
            partner: partnerHandle || 'operator',
            code: keyCode,
            fingerprint,
          }),
        })
      );
    });

    const results = await Promise.allSettled(sends);
    const mailed = results.filter((result) => result.status === 'fulfilled').length;

    return Response.json({
      conversation_id: conversation.id,
      key_code: keyCode,
      key_fingerprint: fingerprint,
      mailed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}