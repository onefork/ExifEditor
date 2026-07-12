import sharp from 'sharp';

export const nodeImageDecoder = {
  async decode(file) {
    // file in Node.js context may be a Buffer or a Blob-like object with arrayBuffer() method
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width, height: metadata.height };
  },

  async generateThumbnail(file, orientation = 1) {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
    // Generate thumbnail ≤200px, preserve aspect ratio
    let pipeline = sharp(buffer).rotate(); // auto-rotate based on EXIF
    const meta = await sharp(buffer).metadata();
    const maxDim = Math.max(meta.width, meta.height);
    if (maxDim > 200) {
      pipeline = pipeline.resize(200, 200, { fit: 'inside', withoutEnlargement: true });
    }
    // Return as JPEG buffer (core layer will handle the format)
    const thumbnailBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
    // Return as data URL for consistency with web interface
    return `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
  },
};
