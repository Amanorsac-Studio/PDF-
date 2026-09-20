import { ScanPage } from './types';

export type RootStackParamList = {
  Library: undefined;
  Scan: undefined;
  Review: { pages: ScanPage[] };
};
