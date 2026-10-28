import { writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

/**
 * Gera um vídeo .y4m (formato que o Chromium aceita como câmera falsa) mostrando `text` em QR.
 * Escrito à mão para não depender de ffmpeg: luma = QR, croma neutro.
 */
export function writeQrVideo(path: string, text: string, size = 480) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const quiet = 4
  const scale = Math.floor(size / (modules.size + quiet * 2))
  const offset = Math.floor((size - modules.size * scale) / 2)
  const y = Buffer.alloc(size * size, 255)
  for (let row = 0; row < modules.size; row++)
    for (let col = 0; col < modules.size; col++)
      if (modules.get(row, col))
        for (let dy = 0; dy < scale; dy++)
          y.fill(0, (offset + row * scale + dy) * size + offset + col * scale, (offset + row * scale + dy) * size + offset + (col + 1) * scale)
  const chroma = Buffer.alloc((size / 2) * (size / 2) * 2, 128)
  const frame = Buffer.concat([Buffer.from('FRAME\n'), y, chroma])
  const header = Buffer.from(`YUV4MPEG2 W${size} H${size} F10:1 Ip A1:1 C420jpeg\n`)
  writeFileSync(path, Buffer.concat([header, ...Array(10).fill(frame)]))
}
