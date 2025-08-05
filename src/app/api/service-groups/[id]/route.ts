import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// PUT /api/service-groups/[id] - обновить группу услуг
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params
    const body = await request.json()
    const { name, order } = body

    // Валидация
    if (!name) {
      return NextResponse.json(
        { error: 'Название группы обязательно' },
        { status: 400 }
      )
    }

    // Проверяем, что группа принадлежит команде
    const existingGroup = await prisma.serviceGroup.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Группа не найдена' },
        { status: 404 }
      )
    }

    // Проверяем уникальность названия в команде (исключая текущую группу)
    const duplicateGroup = await prisma.serviceGroup.findFirst({
      where: {
        name,
        teamId: decoded.teamId,
        id: { not: id }
      }
    })

    if (duplicateGroup) {
      return NextResponse.json(
        { error: 'Группа с таким названием уже существует' },
        { status: 400 }
      )
    }

    const serviceGroup = await prisma.serviceGroup.update({
      where: { id },
      data: {
        name,
        order: order !== undefined ? order : existingGroup.order
      },
      include: {
        services: {
          where: {
            isArchived: false
          }
        }
      }
    })

    return NextResponse.json(serviceGroup)
  } catch (error) {
    console.error('Ошибка обновления группы услуг:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// DELETE /api/service-groups/[id] - удалить группу услуг
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params

    // Проверяем, что группа принадлежит команде
    const existingGroup = await prisma.serviceGroup.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Группа не найдена' },
        { status: 404 }
      )
    }

    // Перемещаем все услуги из группы в "Без группы"
    await prisma.service.updateMany({
      where: {
        groupId: id
      },
      data: {
        groupId: null
      }
    })

    // Удаляем группу
    await prisma.serviceGroup.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка удаления группы услуг:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}