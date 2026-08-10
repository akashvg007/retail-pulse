import mongoose from 'mongoose'
import { connectDB } from '../lib/db'

async function fixIndex() {
  await connectDB()
  const db = mongoose.connection.db!
  const collection = db.collection('stafffeatures')

  const indexes = await collection.indexes()
  console.log('Current indexes:', indexes.map((i) => i.name))

  const wrongIndex = indexes.find(
    (i) => i.key && i.key.tenantId === 1 && i.key.featureKey === 1 && !i.key.userId
  )

  if (wrongIndex) {
    await collection.dropIndex(wrongIndex.name as string)
    console.log(`✓ Dropped wrong index: ${wrongIndex.name}`)
  } else {
    console.log('No wrong index found — nothing to drop.')
  }

  await collection.createIndex(
    { tenantId: 1, userId: 1, featureKey: 1 },
    { unique: true, name: 'tenantId_1_userId_1_featureKey_1' }
  )
  console.log('✓ Created correct unique index: tenantId_1_userId_1_featureKey_1')

  await mongoose.disconnect()
}

fixIndex().catch((err) => {
  console.error(err)
  process.exit(1)
})
