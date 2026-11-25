import { Job, TradeDocument } from '@/models';

export type DocumentWithJob = {
  document: TradeDocument;
  job: Job | null;
};