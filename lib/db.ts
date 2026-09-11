import mongoose from 'mongoose'

const databaseMode = process.env.MONGODB_MODE?.toLowerCase() || 'cloud'
const mongodbUri = databaseMode === 'local'
  ? process.env.MONGODB_LOCAL_URI
  : process.env.MONGODB_URI

if (databaseMode !== 'local' && databaseMode !== 'cloud') {
  throw new Error('MONGODB_MODE must be either "local" or "cloud"')
}

if (!mongodbUri) {
  const variableName = databaseMode === 'local' ? 'MONGODB_LOCAL_URI' : 'MONGODB_URI'
  throw new Error(`Please define ${variableName} in the environment`)
}

const resolvedMongoDbUri = mongodbUri

declare global {
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

let cached = global._mongooseCache

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null }
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(resolvedMongoDbUri, { bufferCommands: false })
      .then((m) => m)
  }

  cached.conn = await cached.promise
  return cached.conn
}
