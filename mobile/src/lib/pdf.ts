import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';
import base64js from 'base64-js';
import { ScanPage } from './types';

/** A4 at 72dpi, used as an upper bound so portrait pages look consistent. */
const MAX_PAGE_WIDTH_PT = 595;
const MAX_PAGE_HEIGHT_PT = 842;

async function readAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: width * scale, height: height * scale };
}

/**
 * Builds a single PDF, one page per scanned image, and writes it to
 * `destinationUri`. Each page is sized to the image (capped to A4) so the
 * scan fills the page edge-to-edge, matching how paper documents look.
 */
export async function buildPdfFromPages(pages: ScanPage[], destinationUri: string): Promise<void> {
  const pdfDoc = await PDFDocument.create();

  for (const page of pages) {
    const base64 = await readAsBase64(page.uri);
    const bytes = base64js.toByteArray(base64);
    const isPng = page.uri.toLowerCase().endsWith('.png');
    const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

    const { width, height } = fitWithin(
      page.width || image.width,
      page.height || image.height,
      MAX_PAGE_WIDTH_PT,
      MAX_PAGE_HEIGHT_PT,
    );

    const pdfPage = pdfDoc.addPage([width, height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  const base64Out = base64js.fromByteArray(pdfBytes);
  await FileSystem.writeAsStringAsync(destinationUri, base64Out, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
