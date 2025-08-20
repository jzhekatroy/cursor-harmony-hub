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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP' },
        { status: 400 }
      )
    }

    // Проверяем размер файла (максимум 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимальный размер: 5MB' },
        { status: 400 }
      )
    }

    // Создаем уникальное имя файла
    const timestamp = Date.now()
    // Определяем расширение по MIME
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const ext = mimeToExt[file.type] || 'jpg'
    const fileName = `photo_${timestamp}.${ext}`

    // Определяем директорию загрузок:
    // - в dev по умолчанию пишем в public/uploads, чтобы файлы были доступны статически
    // - в prod — пишем в /tmp/uploads (или в UPLOAD_DIR), т.к. public в образе может быть read-only
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
    // Всегда отдаем /uploads/<name> —
    // - в dev это статический файл из public/uploads
    // - в prod этот путь обслуживается route handler'ом (см. app/uploads/[filename]/route.ts)
    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: fileName
    })

  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки файла' },
      { status: 500 }
    )
  }
}