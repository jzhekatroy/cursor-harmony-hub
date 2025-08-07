import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// PUT /api/services/[id] - обновить услугу
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    // Проверяем, что услуга принадлежит команде
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      )
    }

    // Если это операция архивирования/восстановления
    if ('isArchived' in body) {
      const service = await prisma.service.update({
        where: { id },
        data: { isArchived: body.isArchived },
        include: { group: true }
      })
      return NextResponse.json(service)
    }

    // Обычное обновление услуги
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

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        duration: parseInt(duration),
        price: parseFloat(price),
        photoUrl: photoUrl?.trim() || null,
        groupId: groupId || null
      },
      include: {
        group: true
      }
    })

    return NextResponse.json(service)
  } catch (error) {
    console.error('Ошибка обновления услуги:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// DELETE /api/services/[id] - архивировать услугу (не удалять)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const { id } = await params

    // Проверяем, что услуга принадлежит команде
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли активные бронирования с этой услугой
    const activeBookings = await prisma.bookingService.findFirst({
      where: {
        serviceId: id,
        booking: {
          status: {
            in: ['NEW', 'CONFIRMED']
          }
        }
      }
    })

    if (activeBookings) {
      return NextResponse.json(
        { error: 'Нельзя архивировать услугу с активными бронированиями' },
        { status: 400 }
      )
    }

    // Архивируем услугу вместо удаления
    await prisma.service.update({
      where: { id },
      data: { isArchived: true }
    })

    return NextResponse.json({ success: true, message: 'Услуга архивирована' })
  } catch (error) {
    console.error('Ошибка архивирования услуги:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}