import { API_BASE_URL } from '../constants'

export interface LegalDocSection {
  title: string
  content: string
  subsections?: Array<{
    title: string
    content: string
    bulletPoints?: string[]
  }>
  bulletPoints?: string[]
}

export interface ContactInfo {
  email: string
  phone: string
  address: string
  dataProtectionOfficer?: string
}

export interface LegalDocument {
  _id: string
  language: string
  userType: string
  title: string
  content: {
    introduction: string
    sections: LegalDocSection[]
    contactInfo?: ContactInfo
    compliance?: string
  }
  version: string
  isActive: boolean
  effectiveDate: string
  createdAt: string
  updatedAt: string
}

export const legalDocsService = {
  /**
   * Get active Terms of Service for customers
   */
  async getTermsOfService(language: string = 'vi'): Promise<LegalDocument> {
    try {
      console.log('[LegalDocs] Fetching Terms of Service...', { language, apiUrl: API_BASE_URL })

      const response = await fetch(
        `${API_BASE_URL}/legal-docs/terms?userType=customer&language=${language}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('[LegalDocs] Terms response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
        throw new Error(errorData.message || 'Failed to fetch Terms of Service')
      }

      const data = await response.json()
      console.log('[LegalDocs] Terms fetched successfully')
      return data
    } catch (error: any) {
      console.error('[LegalDocs] Error fetching Terms:', error)
      throw error
    }
  },

  /**
   * Get active Privacy Policy for customers
   */
  async getPrivacyPolicy(language: string = 'vi'): Promise<LegalDocument> {
    try {
      console.log('[LegalDocs] Fetching Privacy Policy...', { language, apiUrl: API_BASE_URL })

      const response = await fetch(
        `${API_BASE_URL}/legal-docs/privacy?userType=customer&language=${language}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('[LegalDocs] Privacy response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
        throw new Error(errorData.message || 'Failed to fetch Privacy Policy')
      }

      const data = await response.json()
      console.log('[LegalDocs] Privacy fetched successfully')
      return data
    } catch (error: any) {
      console.error('[LegalDocs] Error fetching Privacy:', error)
      throw error
    }
  },
}
