import mongoose, { Schema, Document, Model } from 'mongoose'

export type UserRole = 'super_admin' | 'store_admin' | 'staff'

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId | null
  name: string
  email: string
  passwordHash: string
  role: UserRole
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'store_admin', 'staff'], default: 'store_admin' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

UserSchema.index({ tenantId: 1, email: 1 })

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
