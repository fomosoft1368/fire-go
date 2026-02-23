import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'
import { API_URL } from '../config/api'

export interface VehicleConditionImages {
  front?: string
  back?: string
  left?: string
  right?: string
  interior?: string
}

export interface TripPhase {
  completed: boolean
  images: VehicleConditionImages
  capturedAt: string | null
}

export interface VehicleCondition {
  preTrip: TripPhase
  postTrip: TripPhase
}

class VehicleConditionService {
  /**
   * Upload vehicle condition images as base64
   * @param rideId - ID of the ride
   * @param phase - 'pre-trip' or 'post-trip'
   * @param imageUris - Array of local image URIs (up to 5)
   */
  async uploadVehicleCondition(
    rideId: string,
    phase: 'pre-trip' | 'post-trip',
    imageUris: string[],
  ): Promise<{ success: boolean; data: VehicleCondition; message: string }> {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Convert images to base64
      console.log('📸 Converting images to base64...')
      const base64Images: string[] = []
      
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i]
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        const fullBase64 = `data:image/jpeg;base64,${base64}`
        base64Images.push(fullBase64)
        
        const sizeKB = Math.round(fullBase64.length / 1024)
        console.log(`   Image ${i + 1}: ${sizeKB} KB`)
      }

      const totalSizeKB = Math.round(base64Images.reduce((sum, img) => sum + img.length, 0) / 1024)
      console.log(`✅ Converted ${base64Images.length} images (total: ${totalSizeKB} KB)`)
      
      if (totalSizeKB > 15000) { // >15MB warning
        console.warn('⚠️  Total size exceeds 15MB, may hit MongoDB limit!')
      }

      const response = await fetch(
        `${API_URL}/rides/${rideId}/vehicle-condition/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phase,
            images: base64Images,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const result = await response.json()
      return result
    } catch (error: any) {
      console.error('❌ Error uploading vehicle condition:', error)
      throw error
    }
  }

  /**
   * Get vehicle condition info for a ride
   */
  async getVehicleCondition(rideId: string): Promise<VehicleCondition> {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(
        `${API_URL}/rides/${rideId}/vehicle-condition`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to fetch vehicle condition')
      }

      const result = await response.json()
      return result.data
    } catch (error: any) {
      console.error('❌ Error fetching vehicle condition:', error)
      throw error
    }
  }
}

export const vehicleConditionService = new VehicleConditionService()
