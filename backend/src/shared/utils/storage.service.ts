/**
 * Google Cloud Storage Service
 * 
 * ⚠️ TEMPORARILY DISABLED - Currently storing images as base64 in MongoDB
 * 
 * To enable GCS later:
 * 1. Follow setup guide in GOOGLE_CLOUD_STORAGE_SETUP.md
 * 2. Install dependencies: npm install @google-cloud/storage uuid
 * 3. Restore the original StorageService code
 * 4. Update RidesService to use StorageService instead of base64
 * 5. Add StorageService to providers in rides.module.ts
 */

// File temporarily disabled - using base64 storage in MongoDB
// Original code commented out until ready to migrate to Google Cloud Storage

export const STORAGE_DISABLED = true;
