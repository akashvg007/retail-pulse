import { parseBillOcrText } from './parse'
import type { OcrExtractedData } from './types'

interface OcrProgressUpdate {
  progress: number
  status?: string
}

export async function extractBillDataFromImage(
  file: File,
  onProgress?: (update: OcrProgressUpdate) => void
): Promise<OcrExtractedData> {
  const tesseractModule = await import('tesseract.js')

  const result = await tesseractModule.recognize(file, 'eng', {
    logger: (message) => {
      const progress = typeof message.progress === 'number' ? message.progress : 0
      onProgress?.({
        progress: Math.max(0, Math.min(1, progress)),
        status: typeof message.status === 'string' ? message.status : undefined,
      })
    },
  })

  return parseBillOcrText(result.data?.text ?? '')
}
