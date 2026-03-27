'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FaqItem } from '@/lib/data/faq'

interface FAQAccordionProps {
  items: FaqItem[]
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div
            key={item.id}
            className={`card overflow-hidden ${isOpen ? 'border-orange-200 shadow-brand' : ''}`}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 hover:bg-orange-50/50 transition-colors"
              aria-expanded={isOpen}
              aria-controls={`faq-content-${item.id}`}
            >
              <span className="font-600 text-slate-800 text-base">{item.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-orange-500 shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              id={`faq-content-${item.id}`}
              className="accordion-content"
              style={{
                maxHeight: isOpen ? '400px' : '0',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                {item.answer}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
