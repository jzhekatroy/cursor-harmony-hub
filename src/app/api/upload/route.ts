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
    const extension = file.name.split('.').pop()
    const fileName = `photo_${timestamp}.${extension}`

    // Создаем директорию для загрузок, если её нет
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
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
    console.error('Ошибка загрузки файла:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки файла' },
      { status: 500 }
    )
  }
}