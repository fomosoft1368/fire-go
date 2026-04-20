'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Clock, ExternalLink, ArrowLeft, User, Share2, Bookmark } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { ArticleDetail, NewsItem } from '@/lib/api/news'
import { formatRelativeTime } from '@/lib/api/news'
import Card3D from '@/components/ui/Card3D'

const SOURCE_COLORS: Record<string, string> = {
  VnExpress: 'bg-blue-100 text-blue-700',
  'Tuổi Trẻ': 'bg-red-100 text-red-700',
  'Dân Trí': 'bg-rose-100 text-rose-700',
}

interface Props {
  article: ArticleDetail
  related: NewsItem[]
}

/** A paragraph that starts with 💡 is a FireGo editorial insert */
function isFireGoParagraph(p: string) {
  return p.startsWith('💡')
}

export default function ArticlePageClient({ article, related }: Props) {
  const contentRef = useRef<HTMLElement>(null)
  const relatedRef = useRef<HTMLElement>(null)
  const contentInView = useInView(contentRef, { once: true, margin: '-60px' })
  const relatedInView = useInView(relatedRef, { once: true, margin: '-60px' })

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: article.title, url: window.location.href })
    }
  }

  return (
    <>
      {/* ── Hero ── */}
      <div className="relative h-72 sm:h-[420px] bg-gradient-to-br from-orange-500 to-amber-400 overflow-hidden">
        {article.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.heroImage}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* Back */}
        <div className="absolute top-4 left-4 sm:left-8 z-10">
          <Link href="/tin-tuc" className="flex items-center gap-2 glass text-white text-sm font-600 px-4 py-2 rounded-full hover:bg-white/30 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tin tức
          </Link>
        </div>

        {/* Title block */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div className="flex flex-wrap items-center gap-2 mb-3"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className={`text-xs font-700 px-2.5 py-1 rounded-full ${SOURCE_COLORS[article.source] ?? 'bg-white/20 text-white'}`}>
                {article.source}
              </span>
              <span className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-600">{article.category}</span>
              {article.pubDate && (
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <Clock className="w-3 h-3" />{formatRelativeTime(article.pubDate)}
                </span>
              )}
            </motion.div>

            <motion.h1
              className="text-xl sm:text-3xl font-900 text-white leading-snug"
              initial={{ opacity: 0, y: 30, rotateX: 15 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              style={{ perspective: '600px' }}
            >
              {article.title}
            </motion.h1>

            {article.author && (
              <motion.p className="flex items-center gap-1.5 mt-2 text-white/70 text-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <User className="w-3.5 h-3.5" /> {article.author}
              </motion.p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Article */}
            <motion.article
              ref={contentRef}
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 40 }}
              animate={contentInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7 }}
            >
              {/* Action bar */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-500 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Xem bài gốc tại {article.source}
                </a>
                <div className="flex items-center gap-2">
                  <button onClick={handleShare} className="p-2 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-500 transition-colors" title="Chia sẻ">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-500 transition-colors" title="Lưu bài">
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Paragraphs + inline body images */}
              <div className="space-y-4">
                {article.content.map((para, i) => {
                  const isFireGo = isFireGoParagraph(para)
                  return (
                    <>
                      {/* Body images gallery — injected after paragraph index 1 */}
                      {i === 2 && article.bodyImages.length > 0 && (
                        <motion.div
                          key="body-imgs"
                          className={`my-6 grid gap-2 ${
                            article.bodyImages.length === 1
                              ? 'grid-cols-1'
                              : article.bodyImages.length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-2 sm:grid-cols-3'
                          }`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={contentInView ? { opacity: 1, y: 0 } : {}}
                          transition={{ duration: 0.5 }}
                        >
                          {article.bodyImages.slice(0, 6).map((imgUrl, idx) => (
                            <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt={`${article.title} — ảnh ${idx + 1}`}
                                className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {isFireGo ? (
                        <motion.div
                          key={i}
                          className="my-6 bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-400 rounded-r-2xl px-5 py-4 flex gap-3"
                          initial={{ opacity: 0, x: -20 }}
                          animate={contentInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        >
                          <span className="text-2xl shrink-0">🔥</span>
                          <div>
                            <p className="text-xs font-700 text-orange-600 uppercase tracking-wide mb-1">Góc nhìn FireGo</p>
                            <p className="text-slate-700 text-sm leading-relaxed">{para.replace('💡 Góc nhìn FireGo: ', '')}</p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.p
                          key={i}
                          className="text-slate-700 leading-relaxed text-base"
                          initial={{ opacity: 0, y: 16 }}
                          animate={contentInView ? { opacity: 1, y: 0 } : {}}
                          transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.5) }}
                        >
                          {para}
                        </motion.p>
                      )}
                    </>
                  )
                })}
              </div>

              {/* Source footer */}
              <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Nguồn tổng hợp:</span>
                  <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-700 text-orange-500 hover:underline">
                    {article.source} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Link href="/tin-tuc" className="text-sm font-600 text-orange-500 hover:text-orange-600 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Tất cả tin tức
                </Link>
              </div>
            </motion.article>

            {/* Sidebar */}
            <motion.aside
              ref={relatedRef}
              className="lg:col-span-1 space-y-4"
              initial={{ opacity: 0, x: 30 }}
              animate={relatedInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="font-800 text-slate-900 text-lg mb-4">Tin liên quan</h2>
              {related.length === 0 && (
                <p className="text-sm text-slate-400">Không có bài liên quan.</p>
              )}
              {related.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={relatedInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}>
                  <Card3D intensity={4}>
                    <Link href={`/tin-tuc/${item.slug}`}
                      className="card group flex gap-3 p-3 hover:shadow-brand transition-all">
                      {item.imageUrl && (
                        <div className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.imageUrl} alt={item.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-700 text-orange-500 mb-1">{item.category}</p>
                        <h3 className="text-sm font-600 text-slate-800 line-clamp-3 group-hover:text-orange-600 transition-colors leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(item.pubDate)}</p>
                      </div>
                    </Link>
                  </Card3D>
                </motion.div>
              ))}

              {/* FireGo CTA */}
              <div className="mt-6 bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl p-5 text-white">
                <div className="text-3xl mb-2">🔥</div>
                <h3 className="font-800 text-lg mb-1">Đặt dịch vụ FireGo</h3>
                <p className="text-orange-100 text-sm mb-4">Ghép xe, lái hộ, vận chuyển, vệ sinh — chỉ trong vài giây</p>
                <Link href="/" className="block bg-white text-orange-600 font-700 text-sm text-center py-2 rounded-xl hover:bg-orange-50 transition-colors">
                  Xem dịch vụ →
                </Link>
              </div>
            </motion.aside>
          </div>
        </div>
      </div>
    </>
  )
}
