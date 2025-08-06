import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// GET /api/services - получить все услуги команды
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    // Проверяем параметр includeArchived
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const whereClause: any = {
      teamId: decoded.teamId
    }

    // Если не включаем архивные, фильтруем их
    if (!includeArchived) {
      whereClause.isArchived = false
    }

    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        group: true,
        masters: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { group: { order: 'asc' } },
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Ошибка получения услуг:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/services - создать новую услугу
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, duration, price, photoUrl, groupId } = body

    // Валидация
    if (!name || !duration || price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Название, продолжительность и цена обязательны' },
        { status: 400 }
      )
    }

    if (duration < 15) {
      return NextResponse.json(
        { error: 'Минимальная продолжительность 15 минут' },
        { status: 400 }
      )
    }

    if (price < 0) {
      return NextResponse.json(
        { error: 'Цена не может быть отрицательной' },
        { status: 400 }
      )
    }

    // Проверяем, что группа принадлежит команде (если указана)
    if (groupId) {
      const group = await prisma.serviceGroup.findFirst({
        where: {
          id: groupId,
          teamId: decoded.teamId
        }
      })

      if (!group) {
        return NextResponse.json(
          { error: 'Группа не найдена' },
          { status: 404 }
        )
      }
    }

    // Получаем следующий порядковый номер
    const maxOrder = await prisma.service.aggregate({
      where: {
        teamId: decoded.teamId,
        groupId: groupId || null
      },
      _max: {
        order: true
      }
    })

    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        duration: parseInt(duration),
        price: parseFloat(price),
        photoUrl: photoUrl?.trim() || null,
        teamId: decoded.teamId,
        groupId: groupId || null,
        order: (maxOrder._max.order || 0) + 1
      },
      include: {
        group: true
      }
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Ошибка создания услуги:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}