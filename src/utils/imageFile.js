const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // 15MB - guards against hanging the browser on huge photos

/**
 * Reads a File picked from an <input type="file">, downsizes it to fit
 * within `maxDimension` on its longest side, and re-encodes it as a JPEG
 * data URI. There's no upload endpoint or object storage anywhere in this
 * app (see Product.images/Store.logoUrl/etc.) - images are admin/vendor-
 * pasted URL strings, and this feature slots into that exact convention:
 * the compressed data URI is just another string for the same field, so
 * every existing preview/render path already handles it unchanged.
 * Compressing client-side (rather than storing the raw file) keeps that
 * string small enough to be reasonable to store in a DB column and to
 * include in ordinary create/update request bodies.
 */
export function compressImageFile(file, { maxDimension = 1000, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not-an-image"));
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new Error("too-large"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("read-failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
