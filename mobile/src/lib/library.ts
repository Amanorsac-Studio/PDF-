import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DocumentRecord } from './types';

const INDEX_KEY = 'eazyscanner.library.index.v1';

async function readIndex(): Promise<DocumentRecord[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DocumentRecord[];
  } catch {
    return [];
  }
}

async function writeIndex(records: DocumentRecord[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(records));
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const records = await readIndex();
  return records.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function saveDocument(record: DocumentRecord): Promise<void> {
  const records = await readIndex();
  const next = [record, ...records.filter((r) => r.id !== record.id)];
  await writeIndex(next);
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const records = await readIndex();
  const next = records.map((r) =>
    r.id === id ? { ...r, title, updatedAt: new Date().toISOString() } : r,
  );
  await writeIndex(next);
}

export async function deleteDocument(id: string): Promise<void> {
  const records = await readIndex();
  const target = records.find((r) => r.id === id);
  if (target) {
    await FileSystem.deleteAsync(target.pdfUri, { idempotent: true });
    await FileSystem.deleteAsync(target.thumbnailUri, { idempotent: true });
  }
  await writeIndex(records.filter((r) => r.id !== id));
}
