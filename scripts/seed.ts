import { connectDB } from '../lib/db'
import { FeatureFlag } from '../models/FeatureFlag'
import { User } from '../models/User'
import { ALL_FEATURE_KEYS, FEATURE_META } from '../types/features'
import bcrypt from 'bcryptjs'

async function seed() {
  await connectDB()
  console.log('Connected to MongoDB')

  // Seed feature flags
  for (const key of ALL_FEATURE_KEYS) {
    await FeatureFlag.findOneAndUpdate(
      { key },
      {
        $setOnInsert: {
          key,
          name: FEATURE_META[key].name,
          description: FEATURE_META[key].description,
          globalEnabled: false,
          beta: true,
        },
      },
      { upsert: true }
    )
  }
  console.log(`✓ Seeded ${ALL_FEATURE_KEYS.length} feature flags (all disabled by default)`)

  // Keep procurement features hidden until explicitly enabled for a tenant.
  await FeatureFlag.findOneAndUpdate(
    { key: 'supplier_management' },
    { $set: { globalEnabled: false, beta: true } }
  )
  await FeatureFlag.findOneAndUpdate(
    { key: 'purchase_management' },
    { $set: { globalEnabled: false, beta: true } }
  )

  // Seed super admin if not exists
  const existing = await User.findOne({ role: 'super_admin' })
  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12)
    await User.create({
      name: 'Super Admin',
      email: 'admin@retailpulse.com',
      passwordHash,
      role: 'super_admin',
      tenantId: null,
    })
    console.log('✓ Created super admin: admin@retailpulse.com / Admin@1234')
    console.log('  ⚠ Change the password immediately after first login!')
  } else {
    console.log('✓ Super admin already exists, skipping')
  }

  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
