import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Получаем мастеров только для команды пользователя
    const masters = await prisma.master.findMany({
      where: { 
        isActive: true,
        teamId: user.teamId
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    const mastersList = masters.map(master => ({
      id: master.id,
      firstName: master.firstName,
      lastName: master.lastName,
      isActive: master.isActive
    }))

    return NextResponse.json({
      total: mastersList.length,
      masters: mastersList
    })
  } catch (error) {
    console.error('Ошибка получения списка мастеров:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
}