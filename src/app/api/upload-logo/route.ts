import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP, SVG' },
        { status: 400 }
      )
    }

    // Проверяем размер файла (максимум 2MB для логотипов)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимальный размер: 2MB' },
        { status: 400 }
      )
    }

    // Создаем уникальное имя файла для логотипа
    const timestamp = Date.now()
    // Определяем расширение по MIME
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    }
    const ext = mimeToExt[file.type] || 'png'
    const fileName = `logo_${timestamp}.${ext}`

    // Определяем директорию загрузок (тот же каталог, что и для фото услуг)
    const defaultDevDir = join(process.cwd(), 'public', 'uploads')
    const defaultProdDir = '/tmp/uploads'
    const uploadsDir = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'development' ? defaultDevDir : defaultProdDir)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Сохраняем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(uploadsDir, fileName)
    
    await writeFile(filePath, buffer)

    // Возвращаем URL файла
    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: fileName
    })

  } catch (error) {
    console.error('Ошибка загрузки логотипа:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки логотипа' },
      { status: 500 }
    )
  }
}
