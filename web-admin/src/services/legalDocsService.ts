/// <reference types="vite/client" />

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.9:3000/api';

export interface LegalDocContent {
  introduction: string;
  sections: {
    title: string;
    content: string;
    subsections?: {
      title: string;
      content: string;
      bulletPoints?: string[];
    }[];
    bulletPoints?: string[];
  }[];
  contactInfo?: {
    email: string;
    phone: string;
    address: string;
    dataProtectionOfficer?: string;
  };
  compliance?: string;
}

export interface TermsOfService {
  _id?: string;
  language: string;
  userType: string;
  title: string;
  content: LegalDocContent;
  version: string;
  isActive: boolean;
  effectiveDate: Date;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrivacyPolicy {
  _id?: string;
  language: string;
  userType: string;
  title: string;
  content: LegalDocContent;
  version: string;
  isActive: boolean;
  effectiveDate: Date;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

class LegalDocsService {
  private getAuthToken() {
    return localStorage.getItem('token');
  }

  private getHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // ==================== TERMS OF SERVICE ====================

  async getActiveTerms(userType: string = 'driver', language: string = 'vi'): Promise<TermsOfService> {
    const response = await fetch(
      `${API_BASE_URL}/legal-docs/terms?userType=${userType}&language=${language}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<TermsOfService>(response);
  }

  async getAllTerms(): Promise<TermsOfService[]> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/terms`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<TermsOfService[]>(response);
  }

  async getTermsById(id: string): Promise<TermsOfService> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/terms/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<TermsOfService>(response);
  }

  async createTerms(data: Partial<TermsOfService>): Promise<TermsOfService> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/terms`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<TermsOfService>(response);
  }

  async updateTerms(id: string, data: Partial<TermsOfService>): Promise<TermsOfService> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/terms/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<TermsOfService>(response);
  }

  async deleteTerms(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/terms/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  // ==================== PRIVACY POLICY ====================

  async getActivePrivacy(userType: string = 'driver', language: string = 'vi'): Promise<PrivacyPolicy> {
    const response = await fetch(
      `${API_BASE_URL}/legal-docs/privacy?userType=${userType}&language=${language}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<PrivacyPolicy>(response);
  }

  async getAllPrivacy(): Promise<PrivacyPolicy[]> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/privacy`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PrivacyPolicy[]>(response);
  }

  async getPrivacyById(id: string): Promise<PrivacyPolicy> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/privacy/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PrivacyPolicy>(response);
  }

  async createPrivacy(data: Partial<PrivacyPolicy>): Promise<PrivacyPolicy> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/privacy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<PrivacyPolicy>(response);
  }

  async updatePrivacy(id: string, data: Partial<PrivacyPolicy>): Promise<PrivacyPolicy> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/privacy/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<PrivacyPolicy>(response);
  }

  async deletePrivacy(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/legal-docs/admin/privacy/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }
}

export const legalDocsService = new LegalDocsService();
