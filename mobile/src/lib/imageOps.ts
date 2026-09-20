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

/** Long-edge cap for persisted pages: plenty for a crisp printed/exported PDF page,
 * while keeping a 1000-photo import fast and the resulting PDF a sane size. */
const MAX_DIMENSION = 2200;

/**
 * Copies a freshly captured/picked image into app storage (so it survives
 * cache clears) and downscales it if it's larger than we need.
 */
export async function persistCapture(sourceUri: string, id: string): Promise<{ uri: string; width: number; height: number }> {
  await ensureScansDir();
  const dest = `${SCANS_DIR}${id}.jpg`;

  const probe = await ImageManipulator.manipulateAsync(sourceUri, [], { compress: 1 });
  const longEdge = Math.max(probe.width, probe.height);
  const actions =
    longEdge > MAX_DIMENSION
      ? [probe.width >= probe.height ? { resize: { width: MAX_DIMENSION } } : { resize: { height: MAX_DIMENSION } }]
      : [];

  const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  await FileSystem.copyAsync({ from: result.uri, to: dest });
  return { uri: dest, width: result.width, height: result.height };
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
