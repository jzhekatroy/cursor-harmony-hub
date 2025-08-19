import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'

function getUploadsDir(): string {
  const defaultDevDir = join(process.cwd(), 'public', 'uploads')
  const defaultProdDir = '/tmp/uploads'
  return process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'development' ? defaultDevDir : defaultProdDir)
}

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return new NextResponse('Not found', { status: 404 })
    }

    const uploadsDir = getUploadsDir()
    const filePath = join(uploadsDir, filename)
    if (!existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    const contentType = getContentType(filename)
    // Преобразуем Node.js Buffer в ArrayBuffer, совместимый с Web Response API
    const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    const res = new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
    return res
  } catch (err) {
    console.error('Upload serve error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}


