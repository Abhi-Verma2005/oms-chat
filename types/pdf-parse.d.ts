declare module "pdf-parse/lib/pdf-parse" {
  import type { PDFDataParserOptions } from "pdf-parse";

  export interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
    text: string;
  }

  export default function pdfParse(
    buffer: Buffer | Uint8Array | ArrayBuffer,
    options?: PDFDataParserOptions
  ): Promise<PDFParseResult>;
}

