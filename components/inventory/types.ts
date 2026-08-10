import type { z } from 'zod'
import type { productSchema } from '@/lib/validations'

export type ProductForm = z.infer<typeof productSchema>
