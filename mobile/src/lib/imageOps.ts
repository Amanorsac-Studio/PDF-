import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { ScanPage } from './types';

const SCANS_DIR = `${FileSystem.documentDirectory}eazyscanner-pages/`;

export async function ensureScansDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SCANS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SCANS_DIR, { intermediates: true });
  }
}

/** Copies a freshly captured/picked image into app storage so it survives cache clears. */
export async function persistCapture(sourceUri: string, id: string): Promise<{ uri: string; width: number; height: number }> {
  await ensureScansDir();
  const dest = `${SCANS_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  const { width, height } = await getImageSize(dest);
  return { uri: dest, width, height };
}

async function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(uri, [], { compress: 1 });
  return { width: result.width, height: result.height };
}

/** Rotates a page 90 degrees clockwise, always re-deriving from the original capture. */
export async function rotatePage(page: ScanPage): Promise<ScanPage> {
  const rotation = (page.rotation + 90) % 360;
  const result = await ImageManipulator.manipulateAsync(
    page.originalUri,
    rotation === 0 ? [] : [{ rotate: rotation }],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { ...page, uri: result.uri, rotation, width: result.width, height: result.height };
}

export async function deletePageFiles(page: ScanPage): Promise<void> {
  await FileSystem.deleteAsync(page.originalUri, { idempotent: true });
  if (page.uri !== page.originalUri) {
    await FileSystem.deleteAsync(page.uri, { idempotent: true });
  }
}
