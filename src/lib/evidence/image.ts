import sharp from "sharp";
import { createHash } from "node:crypto";

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
export type EvidenceErrorCode =
  | "fileType"
  | "fileSize"
  | "fileContent"
  | "fileCount"
  | "permission"
  | "closed"
  | "storage"
  | "config"
  | "limit"
  | "expired"
  | "uploadFailed"
  | "csrf"
  | "server";
export class EvidenceError extends Error {
  code: EvidenceErrorCode;
  constructor(code: EvidenceErrorCode) {
    super(code);
    this.name = "EvidenceError";
    this.code = code;
  }
}
export type PreparedEvidence = { bytes: Buffer; digest: string };
export async function prepareEvidence(file: File): Promise<PreparedEvidence> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new EvidenceError("fileType");
  if (!file.size || file.size > MAX_EVIDENCE_BYTES)
    throw new EvidenceError("fileSize");
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const decoder = sharp(input, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    const metadata = await decoder.metadata();
    const expected = file.type === "image/jpeg" ? "jpeg" : file.type.slice(6);
    if (metadata.format !== expected || (metadata.pages ?? 1) > 1)
      throw new EvidenceError("fileContent");
    // Default Sharp output strips EXIF/XMP/IPTC, including GPS; rotation honors orientation first.
    const bytes = await decoder.rotate().webp({ quality: 85 }).toBuffer();
    if (bytes.byteLength > MAX_EVIDENCE_BYTES)
      throw new EvidenceError("fileSize");
    return { bytes, digest: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    if (error instanceof EvidenceError) throw error;
    throw new EvidenceError("fileContent");
  }
}
export function evidenceRequestKey(
  batch: string,
  index: number,
  digest: string,
) {
  const hex = createHash("sha256")
    .update(`${batch}:${index}:${digest}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
