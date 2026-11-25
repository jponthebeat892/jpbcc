import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Turns an operator handle into the account email so the login form can accept
// either a handle or an email. Only the matched email is returned - never a list.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';

    if (!identifier || identifier.length > 120) {
      return Response.json({ error: 'Enter your handle or email.' }, { status: 400 });
    }

    if (identifier.includes('@')) {
      return Response.json({ email: identifier });
    }

    if (!/^[a-z0-9_]+$/.test(identifier)) {
      return Response.json({ error: 'That handle is not valid.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const { items } = await base44.asServiceRole.entities.LoginAlias.filter(
      { username: identifier },
      { limit: 1, fields: ['email'] }
    );

    if (!items || items.length === 0) {
      return Response.json({ error: 'No operator found with that handle.' }, { status: 404 });
    }

    return Response.json({ email: items[0].email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}