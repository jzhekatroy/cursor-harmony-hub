import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// GET /api/service-groups - получить все группы услуг команды
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

    const serviceGroups = await prisma.serviceGroup.findMany({
      where: {
        teamId: decoded.teamId
      },
      include: {
        services: {
          where: {
            isArchived: false
          },
          orderBy: [
            { order: 'asc' },
            { name: 'asc' }
          ]
        }
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(serviceGroups)
  } catch (error) {
    console.error('Ошибка получения групп услуг:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/service-groups - создать новую группу услуг
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
    const { name, order } = body

    // Валидация
    if (!name) {
      return NextResponse.json(
        { error: 'Название группы обязательно' },
        { status: 400 }
      )
    }

    // Проверяем уникальность названия в команде
    const existingGroup = await prisma.serviceGroup.findFirst({
      where: {
        name,
        teamId: decoded.teamId
      }
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Группа с таким названием уже существует' },
        { status: 400 }
      )
    }

    // Если порядок не указан, ставим в конец
    let finalOrder = order
    if (finalOrder === undefined || finalOrder === null) {
      const maxOrder = await prisma.serviceGroup.aggregate({
        where: {
          teamId: decoded.teamId
        },
        _max: {
          order: true
        }
      })
      finalOrder = (maxOrder._max.order || 0) + 1
    }

    const serviceGroup = await prisma.serviceGroup.create({
      data: {
        name,
        order: finalOrder,
        teamId: decoded.teamId
      },
      include: {
        services: {
          where: {
            isArchived: false
          }
        }
      }
    })

    return NextResponse.json(serviceGroup, { status: 201 })
  } catch (error) {
    console.error('Ошибка создания группы услуг:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}