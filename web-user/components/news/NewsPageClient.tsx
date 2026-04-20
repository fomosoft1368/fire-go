'use client'

import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Newspaper, Clock, ExternalLink, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { NewsItem } from '@/lib/api/news'
import { formatRelativeTime } from '@/lib/api/news'
import Card3D from '@/components/ui/Card3D'

interface Props {
  news: NewsItem[]
}

const ITEMS_PER_PAGE = 12

const SOURCE_COLORS: Record<string, string> = {
  VnExpress: 'bg-blue-100 text-blue-700',
  'Tuổi Trẻ': 'bg-red-100 text-red-700',
  'Dân Trí': 'bg-rose-100 text-rose-700',
}

const CATEGORIES = ['Tất cả', 'Giao thông', 'Kinh doanh', 'Đời sống', 'Xe cộ', 'Nhịp sống', 'Xã hội']

const cardVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] },
  },
  exit: { opacity: 0, y: -20, scale: 0.96, transition: { duration: 0.25 } },
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <motion.div variants={cardVariants} layout>
      <Card3D intensity={5} className="h-full">
        <Link
          href={item.slug ? `/tin-tuc/${item.slug}` : item.link}
          {...(item.slug ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          className="card group flex flex-col h-full overflow-hidden hover:shadow-brand-lg transition-all duration-300"
        >
          {/* Thumbnail */}
          <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-50 shrink-0">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Newspaper className="w-12 h-12 text-orange-200" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-700 px-2.5 py-1 rounded-full">
              {item.category}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-700 text-slate-900 text-sm leading-snug mb-2 line-clamp-3 group-hover:text-orange-600 transition-colors">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2 flex-1">
                {item.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
              <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${SOURCE_COLORS[item.source] ?? 'bg-slate-100 text-slate-600'}`}>
                {item.source}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(item.pubDate)}
                <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </Link>
      </Card3D>
    </motion.div>
  )
}

// ── Pagination Component ──────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  // Generate page numbers to show (max 7 visible)
  const pages: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('ellipsis')
    const start = Math.max(2, currentPage - 1)
    const end   = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-12 flex-wrap">
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-600 bg-white border border-slate-200 text-slate-600
          hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600
          shadow-sm"
        aria-label="Trang trước"
      >
        <ChevronLeft className="w-4 h-4" />
        Trước
      </button>

      {/* Page numbers */}
      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-xl text-sm font-700 transition-all duration-200 shadow-sm ${
              p === currentPage
                ? 'gradient-primary text-white shadow-brand scale-105'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'
            }`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-600 bg-white border border-slate-200 text-slate-600
          hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600
          shadow-sm"
        aria-label="Trang sau"
      >
        Sau
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────
export default function NewsPageClient({ news }: Props) {
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [currentPage, setCurrentPage] = useState(1)
  const gridRef = useRef<HTMLDivElement>(null)
  const listInView = useInView(gridRef, { once: true, margin: '-40px' })

  // Filter by category
  const filtered = useMemo(() => {
    if (activeCategory === 'Tất cả') return news
    return news.filter(n => n.category === activeCategory)
  }, [news, activeCategory])

  // Featured = first item with image (only shown on page 1 of "Tất cả")
  const featured = news.find(n => n.imageUrl)
  const gridItems = useMemo(() => {
    const base = activeCategory === 'Tất cả' ? filtered.filter(n => n !== featured) : filtered
    return base
  }, [filtered, featured, activeCategory])

  // Pagination
  const totalPages = Math.ceil(gridItems.length / ITEMS_PER_PAGE)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return gridItems.slice(start, start + ITEMS_PER_PAGE)
  }, [gridItems, currentPage])

  const availableCategories = useMemo(() => {
    const cats = new Set(news.map(n => n.category))
    return CATEGORIES.filter(c => c === 'Tất cả' || cats.has(c))
  }, [news])

  // Reset to page 1 when category changes
  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat)
    setCurrentPage(1)
  }, [])

  // Scroll to grid top on page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  const showFeatured = activeCategory === 'Tất cả' && currentPage === 1 && featured

  return (
    <>
      {/* ── Hero ── */}
      <div className="gradient-primary py-14 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '52px 52px',
            transform: 'perspective(400px) rotateX(22deg) scale(2)',
            transformOrigin: '50% 0%',
          }}
        />
        <motion.div
          className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="text-sm text-orange-200 mb-6">
            <Link href="/" className="hover:text-white">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-600">Tin tức</span>
          </nav>

          <div className="flex items-start gap-5">
            <motion.div
              className="text-5xl mb-3 inline-block"
              animate={{ y: [0, -10, 0], rotateY: [0, 15, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              📰
            </motion.div>
            <div>
              <motion.h1
                className="text-3xl sm:text-4xl font-900 text-white mb-2"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
              >
                Tin tức giao thông & đời sống
              </motion.h1>
              <motion.p
                className="text-orange-100"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
              >
                Cập nhật mới nhất từ{' '}
                <span className="font-700 text-white">VnExpress · Tuổi Trẻ · Dân Trí</span>
                {' '} – làm mới mỗi 30 phút
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-600 transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
              <RefreshCw className="w-3 h-3" />
              <span>{filtered.length} bài</span>
            </div>
          </div>
        </div>
      </div>

      <main className="py-10 bg-slate-50 min-h-screen" ref={gridRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Featured (page 1 only) ── */}
          <AnimatePresence mode="wait">
            {showFeatured && (
              <motion.div
                key="featured"
                className="mb-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Link
                  href={featured!.slug ? `/tin-tuc/${featured!.slug}` : featured!.link}
                  {...(featured!.slug ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  className="group flex flex-col lg:flex-row bg-white rounded-3xl overflow-hidden shadow-brand-lg border border-orange-100 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative h-64 lg:h-auto lg:w-1/2 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-50">
                    {featured!.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featured!.imageUrl}
                        alt={featured!.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
                    <div className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-700 px-3 py-1.5 rounded-full">
                      🔥 Nổi bật
                    </div>
                  </div>
                  <div className="lg:w-1/2 p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-sm font-600 px-3 py-1 rounded-full ${SOURCE_COLORS[featured!.source] ?? 'bg-slate-100 text-slate-600'}`}>
                        {featured!.source}
                      </span>
                      <span className="text-sm text-slate-400">{featured!.category}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-800 text-slate-900 mb-3 leading-snug group-hover:text-orange-600 transition-colors">
                      {featured!.title}
                    </h2>
                    {featured!.description && (
                      <p className="text-slate-500 mb-5 leading-relaxed line-clamp-3">{featured!.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      {formatRelativeTime(featured!.pubDate)}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Grid ── */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Không có tin tức trong danh mục này.</p>
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeCategory}-page${currentPage}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                  style={{ perspective: '1200px' }}
                >
                  {paginated.map((item, i) => (
                    <NewsCard key={`${item.link}-${i}`} item={item} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* ── Pagination ── */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />

              {/* ── Page info ── */}
              <p className="text-center text-xs text-slate-400 mt-4">
                Trang {currentPage}/{totalPages} · Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, gridItems.length)} trong {gridItems.length} bài
              </p>
            </>
          )}

          {/* ── Footer note ── */}
          <div className="mt-10 text-center text-sm text-slate-400">
            <RefreshCw className="w-4 h-4 inline mr-1.5" />
            Tin tức được cập nhật tự động từ RSS mỗi 30 phút · Nguồn: VnExpress, Tuổi Trẻ, Dân Trí
          </div>
        </div>
      </main>
    </>
  )
}
