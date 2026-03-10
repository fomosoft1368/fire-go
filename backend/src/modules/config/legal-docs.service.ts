import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TermsOfService, TermsOfServiceDocument } from './schemas/terms-of-service.schema';
import { PrivacyPolicy, PrivacyPolicyDocument } from './schemas/privacy-policy.schema';

@Injectable()
export class LegalDocsService {
  constructor(
    @InjectModel(TermsOfService.name)
    private termsModel: Model<TermsOfServiceDocument>,
    @InjectModel(PrivacyPolicy.name)
    private privacyModel: Model<PrivacyPolicyDocument>,
  ) {}

  // ==================== TERMS OF SERVICE ====================

  /**
   * Get active Terms of Service
   */
  async getActiveTerms(userType: string, language: string = 'vi'): Promise<TermsOfService> {
    const terms = await this.termsModel
      .findOne({ userType, language, isActive: true })
      .sort({ createdAt: -1 })
      .exec();

    if (!terms) {
      throw new NotFoundException(`Terms of Service not found for ${userType} (${language})`);
    }

    return terms;
  }

  /**
   * Get all Terms of Service (for admin)
   */
  async getAllTerms(): Promise<TermsOfService[]> {
    return this.termsModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Get Terms by ID (for admin)
   */
  async getTermsById(id: string): Promise<TermsOfService> {
    const terms = await this.termsModel.findById(id).exec();
    if (!terms) {
      throw new NotFoundException(`Terms not found with ID: ${id}`);
    }
    return terms;
  }

  /**
   * Create new Terms of Service (admin only)
   */
  async createTerms(data: Partial<TermsOfService>, adminId?: string): Promise<TermsOfService> {
    // Deactivate previous version
    await this.termsModel.updateMany(
      { userType: data.userType, language: data.language },
      { $set: { isActive: false } },
    );

    const terms = await this.termsModel.create({
      ...data,
      isActive: true,
      effectiveDate: new Date(),
      lastModifiedBy: adminId,
      lastModifiedAt: new Date(),
    });

    console.log(`✅ Created Terms of Service: ${data.userType} (${data.language}) v${data.version}`);
    return terms;
  }

  /**
   * Update Terms of Service (admin only)
   */
  async updateTerms(
    id: string,
    data: Partial<TermsOfService>,
    adminId?: string,
  ): Promise<TermsOfService> {
    const terms = await this.termsModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...data,
          lastModifiedBy: adminId,
          lastModifiedAt: new Date(),
        },
      },
      { new: true },
    ).exec();

    if (!terms) {
      throw new NotFoundException(`Terms not found with ID: ${id}`);
    }

    console.log(`✅ Updated Terms of Service: ${id}`);
    return terms;
  }

  /**
   * Delete Terms of Service (admin only)
   */
  async deleteTerms(id: string): Promise<void> {
    const result = await this.termsModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Terms not found with ID: ${id}`);
    }
    console.log(`✅ Deleted Terms of Service: ${id}`);
  }

  // ==================== PRIVACY POLICY ====================

  /**
   * Get active Privacy Policy
   */
  async getActivePrivacy(userType: string, language: string = 'vi'): Promise<PrivacyPolicy> {
    const privacy = await this.privacyModel
      .findOne({ userType, language, isActive: true })
      .sort({ createdAt: -1 })
      .exec();

    if (!privacy) {
      throw new NotFoundException(`Privacy Policy not found for ${userType} (${language})`);
    }

    return privacy;
  }

  /**
   * Get all Privacy Policies (for admin)
   */
  async getAllPrivacy(): Promise<PrivacyPolicy[]> {
    return this.privacyModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Get Privacy by ID (for admin)
   */
  async getPrivacyById(id: string): Promise<PrivacyPolicy> {
    const privacy = await this.privacyModel.findById(id).exec();
    if (!privacy) {
      throw new NotFoundException(`Privacy Policy not found with ID: ${id}`);
    }
    return privacy;
  }

  /**
   * Create new Privacy Policy (admin only)
   */
  async createPrivacy(data: Partial<PrivacyPolicy>, adminId?: string): Promise<PrivacyPolicy> {
    // Deactivate previous version
    await this.privacyModel.updateMany(
      { userType: data.userType, language: data.language },
      { $set: { isActive: false } },
    );

    const privacy = await this.privacyModel.create({
      ...data,
      isActive: true,
      effectiveDate: new Date(),
      lastModifiedBy: adminId,
      lastModifiedAt: new Date(),
    });

    console.log(`✅ Created Privacy Policy: ${data.userType} (${data.language}) v${data.version}`);
    return privacy;
  }

  /**
   * Update Privacy Policy (admin only)
   */
  async updatePrivacy(
    id: string,
    data: Partial<PrivacyPolicy>,
    adminId?: string,
  ): Promise<PrivacyPolicy> {
    const privacy = await this.privacyModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...data,
          lastModifiedBy: adminId,
          lastModifiedAt: new Date(),
        },
      },
      { new: true },
    ).exec();

    if (!privacy) {
      throw new NotFoundException(`Privacy Policy not found with ID: ${id}`);
    }

    console.log(`✅ Updated Privacy Policy: ${id}`);
    return privacy;
  }

  /**
   * Delete Privacy Policy (admin only)
   */
  async deletePrivacy(id: string): Promise<void> {
    const result = await this.privacyModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Privacy Policy not found with ID: ${id}`);
    }
    console.log(`✅ Deleted Privacy Policy: ${id}`);
  }
}
