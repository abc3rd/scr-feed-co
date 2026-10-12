import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { createCustomerHandler } from './handler.js';
export default createCustomerHandler({ createClient: createClientFromRequest });
