import { getNewsBySlug, fetchAllNews } from '@/lib/api/news'
import { fetchArticleDetail } from '@/lib/api/newsServer'
import ArticlePageClient from '@/components/news/ArticlePageClient'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const newsItem = await getNewsBySlug(slug)
  if (!newsItem) return {}

  const article = await fetchArticleDetail(newsItem.link, { category: newsItem.category, slug })
  if (!article) return {}

  const desc = article.content
    .filter(p => !p.startsWith('💡'))
    .join(' ')
    .slice(0, 155)

  return {
    title: `${article.title} | FireGo Tin Tức`,
    description: desc,
    openGraph: {
      title: article.title,
      description: desc,
      // Hero image served from FireGo proxy (our domain)
      images: article.heroImage ? [{ url: `https://firego.vn${article.heroImage}` }] : [],
      type: 'article',
      siteName: 'FireGo',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: desc,
    },
    alternates: {
      canonical: `/tin-tuc/${slug}`,
    },
  }
}

export const revalidate = 3600

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const newsItem = await getNewsBySlug(slug)
  if (!newsItem) notFound()

  const article = await fetchArticleDetail(newsItem.link, {
    category: newsItem.category,
    slug,
    fallbackDescription: newsItem.description,
  })
  if (!article) notFound()

  const allNews = await fetchAllNews(20)
  const related = allNews
    .filter(n => n.slug !== slug && n.category === newsItem.category)
    .slice(0, 4)

  return <ArticlePageClient article={article} related={related} />
}
