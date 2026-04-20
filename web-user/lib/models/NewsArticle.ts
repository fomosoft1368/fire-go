/**
 * NewsArticle — MongoDB model lưu bài báo đã scrape.
 * Slug là key duy nhất (clean SEO URL).
 * Ảnh được lưu dưới dạng hash-key để proxy qua /n/[hash]
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface INewsArticle extends Document {
  slug: string
  title: string
  description: string
  content: string[]          // paragraphs đã transformed
  heroImage: string | null   // original URL
  bodyImages: string[]       // original URLs của ảnh trong bài
  imageUrl: string | null    // thumbnail từ RSS
  source: string
  sourceUrl: string          // link bài gốc
  category: string
  pubDate: string
  author: string
  fetchedAt: Date
  expiresAt: Date            // TTL: tự xóa sau 24 giờ
}

const NewsArticleSchema = new Schema<INewsArticle>(
  {
    slug:        { type: String, required: true, unique: true, index: true },
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    content:     { type: [String], default: [] },
    heroImage:   { type: String, default: null },
    bodyImages:  { type: [String], default: [] },
    imageUrl:    { type: String, default: null },
    source:      { type: String, required: true },
    sourceUrl:   { type: String, required: true },
    category:    { type: String, default: 'Đời sống' },
    pubDate:     { type: String, default: '' },
    author:      { type: String, default: '' },
    fetchedAt:   { type: Date, default: Date.now },
    expiresAt:   { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
)

// TTL index — MongoDB tự xóa bài cũ sau 24h
NewsArticleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const NewsArticle =
  mongoose.models.NewsArticle ||
  mongoose.model<INewsArticle>('NewsArticle', NewsArticleSchema)

export default NewsArticle
