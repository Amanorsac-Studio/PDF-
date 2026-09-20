export interface ScanPage {
  id: string;
  /** URI of the file currently used for export (after crop/rotate applied). */
  uri: string;
  /** URI of the original capture straight from the scanner, before edits. */
  originalUri: string;
  /** Cumulative rotation applied relative to the original capture, in degrees. */
  rotation: number;
  width: number;
  height: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  /** Absolute path to the exported PDF inside the app's document directory. */
  pdfUri: string;
  /** Absolute path to a small JPEG used as a library thumbnail. */
  thumbnailUri: string;
  fileSizeBytes: number;
}
