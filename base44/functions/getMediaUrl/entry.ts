import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Attachments are locked to the two operators of a channel. The message is read
// with the caller's own token, so row level security refuses anyone who is not an
// authorized participant before a short lived link is ever created.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const messageId = typeof body?.message_id === 'string' ? body.message_id : '';
    if (!messageId) return Response.json({ error: 'A message id is required.' }, { status: 400 });

    const message = await base44.entities.Message.get(messageId);
    if (!message || !message.file_uri) {
      return Response.json({ error: 'That attachment is not available.' }, { status: 404 });
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: message.file_uri,
      expires_in: 300,
    });

    return Response.json({ signed_url });
  } catch (error) {
    return Response.json({ error: 'That attachment is locked or no longer exists.' }, { status: 403 });
  }
}