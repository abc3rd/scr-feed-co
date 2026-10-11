import { base44 } from '@/api/base44Client';
export const searchConsolePerformance = input => base44.functions.invoke('searchConsolePerformance', input);
