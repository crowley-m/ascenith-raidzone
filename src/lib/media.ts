import { db } from "@/lib/db";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB raw, before we shrink it
const MAX_EDGE = 1600; // px — plenty for a gallery still / proof screenshot

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ProcessedImage = {
  data: Buffer;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
};

/**
 * Validate an uploaded image and, when `sharp` is available, downscale + re-encode
 * it so we don't stuff multi-MB phone screenshots into Postgres. Falls back to the
 * original bytes (still size-capped) if sharp can't load.
 */
export async function processImageUpload(file: File): Promise<ProcessedImage> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Use a JPG, PNG, WebP or GIF image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is over 8 MB — pick a smaller one.");
  }

  const original = Buffer.from(await file.arrayBuffer());

  try {
    const { default: sharp } = await import("sharp");
    const img = sharp(original, { animated: file.type === "image/gif" });
    const meta = await img.metadata();

    // Keep GIFs as-is (animation); re-encode stills to progressive JPEG.
    if (file.type === "image/gif") {
      return {
        data: original,
        contentType: "image/gif",
        bytes: original.byteLength,
        width: meta.width ?? null,
        height: meta.height ?? null,
      };
    }

    const out = await img
      .rotate() // honour EXIF orientation
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return {
      data: out.data,
      contentType: "image/jpeg",
      bytes: out.data.byteLength,
      width: out.info.width,
      height: out.info.height,
    };
  } catch {
    // sharp unavailable — store the original, but hold the line on size.
    if (original.byteLength > 2 * 1024 * 1024) {
      throw new Error("Image is too large — please upload one under 2 MB.");
    }
    return {
      data: original,
      contentType: file.type,
      bytes: original.byteLength,
      width: null,
      height: null,
    };
  }
}

export async function createMediaAsset(input: {
  kind: "gallery" | "reward" | "proof";
  file: File;
  caption?: string | null;
  tag?: string | null;
  sortOrder?: number;
  createdById?: string | null;
}) {
  const img = await processImageUpload(input.file);
  return db.mediaAsset.create({
    data: {
      kind: input.kind,
      data: img.data,
      contentType: img.contentType,
      bytes: img.bytes,
      width: img.width,
      height: img.height,
      caption: input.caption?.trim() || null,
      tag: input.tag?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      createdById: input.createdById ?? null,
    },
    select: { id: true },
  });
}
