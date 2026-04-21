/**
 * MongoDB model lưu hash → originalUrl cho image proxy
 * TTL: 7 ngày (ảnh không bị broken khi cold-start)
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface IImageCache extends Document {
  hash: string
  originalUrl: string
  expiresAt: Date
}

const ImageCacheSchema = new Schema<IImageCache>(
  {
    hash:        { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true },
    expiresAt:   { type: Date,   default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: false }
)

// TTL index — MongoDB tự xóa sau 7 ngày
ImageCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const ImageCache =
  mongoose.models.ImageCache ||
  mongoose.model<IImageCache>('ImageCache', ImageCacheSchema)

export default ImageCache
