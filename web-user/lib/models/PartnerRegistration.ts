import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerRegistration extends Document {
  fullName: string
  phone: string
  email: string
  city: string
  serviceType: string
  vehicleType?: string
  experience?: string
  message?: string
  createdAt: Date
}

const PartnerRegistrationSchema = new Schema<IPartnerRegistration>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true },
    serviceType: { type: String, required: true, enum: ['ghep-xe', 'lai-ho', 'van-chuyen', 've-sinh'] },
    vehicleType: { type: String },
    experience: { type: String },
    message: { type: String },
  },
  { timestamps: true }
)

const PartnerRegistration =
  mongoose.models.PartnerRegistration ||
  mongoose.model<IPartnerRegistration>('PartnerRegistration', PartnerRegistrationSchema)

export default PartnerRegistration
