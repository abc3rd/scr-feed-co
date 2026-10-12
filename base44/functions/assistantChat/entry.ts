import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { createAssistantHandler } from './handler.ts';

// The site remains public. Paid AI is available only to verified Base44 users.
export default createAssistantHandler({
  createClient: createClientFromRequest,
  readEnv: (name) => Deno.env.get(name),
  fetchImpl: fetch,
});
