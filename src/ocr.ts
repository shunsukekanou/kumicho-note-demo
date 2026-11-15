// 端末内OCR（Tesseract.js）。エンジンと日本語データは、このアプリ自身から配信し、外部サービスは使わない
import type { Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null
let progressCb: ((p: number, label: string) => void) | null = null

function base() {
  return new URL('tesseract/', window.location.href).href.replace(/\/$/, '')
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      return createWorker('jpn', 1, {
        workerPath: `${base()}/worker.min.js`,
        corePath: base(),
        // 配信先によっては .gz を置けないため、.wasm の名前で置き、「?」以降を無視させる
        langPath: `${base()}/jpn-traineddata.wasm?`,
        logger: (m) => {
          const label = m.status === 'recognizing text' ? '文字を読み取り中' : '準備中（初回だけ時間がかかります）'
          progressCb?.(m.progress ?? 0, label)
        },
      })
    })().catch((e) => {
      workerPromise = null
      throw e
    })
  }
  return workerPromise
}

// 写真を縮小し、白黒にして読み取りやすくする
async function preprocess(blob: Blob, MAX = 1800): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('画像を開けませんでした'))
      i.src = url
    })
    const s = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * s)
    c.height = Math.round(img.naturalHeight * s)
    const ctx = c.getContext('2d')!
    ctx.filter = 'grayscale(1) contrast(1.25)'
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function readImage(blob: Blob, onProgress: (p: number, label: string) => void): Promise<string> {
  progressCb = onProgress
  onProgress(0, '準備中（初回だけ時間がかかります）')
  const worker = await getWorker()
  const canvas = await preprocess(blob)
  const { data } = await worker.recognize(canvas)
  return data.text
}
