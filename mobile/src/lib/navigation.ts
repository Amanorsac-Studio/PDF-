import { ScanPage } from './types';

export type RootStackParamList = {
  Library: undefined;
  Scan: undefined;
  Camera: undefined;
  Review: { pages: ScanPage[] };
};
