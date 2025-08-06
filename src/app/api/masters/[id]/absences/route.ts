import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyToken } from '@/lib/auth'

interface AbsenceItem {
  startDate: string
  endDate: string
  reason?: string
}

// GET /api/masters/[id]/absences - получить отпуска/отсутствия мастера
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Проверяем права доступа (только админы)
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав доступа' }, { status: 403 })
    }

    // Проверяем, что мастер принадлежит команде
    const master = await prisma.master.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!master) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
    }

    // Получаем отпуска/отсутствия мастера
    const absences = await prisma.masterAbsence.findMany({
      where: {
        masterId: id
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    return NextResponse.json({ absences })

  } catch (error) {
    console.error('Absences get error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// POST /api/masters/[id]/absences - добавить отпуск/отсутствие
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Проверяем права доступа (только админы)
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав доступа' }, { status: 403 })
    }

    const body = await request.json()
    const { startDate, endDate, reason } = body

    console.log('Absence create request:', { masterId: id, startDate, endDate, reason })

    // Валидация
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate и endDate обязательны' }, { status: 400 })
    }

    // Проверяем, что мастер принадлежит команде
    const master = await prisma.master.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!master) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
    }

    // Валидация дат
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Неверный формат даты' }, { status: 400 })
    }

    if (start > end) {
      return NextResponse.json({ error: 'Дата начала должна быть раньше даты окончания' }, { status: 400 })
    }

    // Проверяем пересечения с существующими отпусками
    const overlappingAbsences = await prisma.masterAbsence.findMany({
      where: {
        masterId: id,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    })

    if (overlappingAbsences.length > 0) {
      return NextResponse.json({ 
        error: 'Указанный период пересекается с существующим отпуском/отсутствием' 
      }, { status: 400 })
    }

    // Создаем отпуск/отсутствие
    const absence = await prisma.masterAbsence.create({
      data: {
        masterId: id,
        startDate: start,
        endDate: end,
        reason: reason || null
      }
    })

    return NextResponse.json({ 
      success: true, 
      absence 
    })

  } catch (error) {
    console.error('Absence create error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}