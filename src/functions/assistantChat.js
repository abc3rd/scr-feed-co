import { base44 } from '@/api/base44Client';
export const assistantChat = input => base44.functions.invoke('assistantChat', input);
