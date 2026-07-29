import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IStaff extends Document {
  tenantId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  department?: string
  permissions: string[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const StaffSchema = new Schema<IStaff>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: String,
    permissions: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

StaffSchema.index({ tenantId: 1, userId: 1 }, { unique: true })

export const Staff: Model<IStaff> =
  mongoose.models.Staff ?? mongoose.model<IStaff>('Staff', StaffSchema)
