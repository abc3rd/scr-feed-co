import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const MAX_MESSAGES = 16;
const MAX_CHARS = 2000;

// Customer-facing SCR Feed Co. assistant. Public endpoint (used from QR landing pages),
// so it validates and bounds its input and only returns the assistant's reply.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const raw = Array.isArray(body?.messages) ? body.messages : [];
    const messages = raw
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_MESSAGES)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, MAX_CHARS),
      }));
    if (!messages.length) return Response.json({ error: 'No message provided.' }, { status: 400 });

    const ctx = body?.context && typeof body.context === 'object' ? body.context : {};
    const transcript = messages
      .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'Customer'}: ${m.content}`)
      .join('\n');

    const prompt = `${buildSystem(ctx)}\n\nConversation so far:\n${transcript}\n\nWrite the Assistant's next reply. Plain text only, 1-3 short sentences, no markdown.`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ reply: typeof reply === 'string' ? reply : String(reply ?? '') });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildSystem(ctx) {
  const parts = [
    'You are the SCR Feed Co. assistant for a livestock feed, hay, and farm-supply store with locations in LaBelle and Fort Myers, Florida.',
    'Help customers with feed and supply questions, order status, reorders, pickup and delivery, and everyday livestock care.',
    'Be warm, plain-spoken, and brief. Never invent prices, stock levels, order numbers, or delivery dates you were not given — if you are unsure, tell them to call the store.',
    'For any animal health emergency, tell them to call the store or a veterinarian right away.',
  ];
  if (ctx.firstName) parts.push(`The customer's first name is ${String(ctx.firstName).slice(0, 40)}.`);
  if (ctx.store) parts.push(`Their preferred store is ${String(ctx.store).slice(0, 40)}.`);
  if (ctx.lastOrder) parts.push(`Their most recent order summary: ${String(ctx.lastOrder).slice(0, 200)}.`);
  return parts.join(' ');
}