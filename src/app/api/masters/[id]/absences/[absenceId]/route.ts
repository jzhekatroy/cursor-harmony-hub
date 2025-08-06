import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyToken } from '@/lib/auth'

// PUT /api/masters/[id]/absences/[absenceId] - обновить отпуск/отсутствие
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; absenceId: string }> }
) {
  try {
    const { id, absenceId } = await params
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
    const { startDate, endDate, reason, description, isRecurring } = body

    console.log('Absence update request:', { masterId: id, absenceId, startDate, endDate, reason })

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

    // Проверяем, что отпуск принадлежит мастеру
    const existingAbsence = await prisma.masterAbsence.findFirst({
      where: {
        id: absenceId,
        masterId: id
      }
    })

    if (!existingAbsence) {
      return NextResponse.json({ error: 'Отпуск/отсутствие не найдено' }, { status: 404 })
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

    // Проверяем пересечения с другими отпусками (исключая текущий)
    const overlappingAbsences = await prisma.masterAbsence.findMany({
      where: {
        masterId: id,
        id: { not: absenceId }, // Исключаем текущий отпуск
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

    // Обновляем отпуск/отсутствие
    const updatedAbsence = await prisma.masterAbsence.update({
      where: {
        id: absenceId
      },
      data: {
        startDate: start,
        endDate: end,
        reason: reason || null,
        description: description || null,
        isRecurring: isRecurring !== undefined ? isRecurring : false
      }
    })

    return NextResponse.json({ 
      success: true, 
      absence: updatedAbsence 
    })

  } catch (error) {
    console.error('Absence update error:', error)
    
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

// DELETE /api/masters/[id]/absences/[absenceId] - удалить отпуск/отсутствие
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; absenceId: string }> }
) {
  try {
    const { id, absenceId } = await params
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

    console.log('Absence delete request:', { masterId: id, absenceId })

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

    // Проверяем, что отпуск принадлежит мастеру
    const existingAbsence = await prisma.masterAbsence.findFirst({
      where: {
        id: absenceId,
        masterId: id
      }
    })

    if (!existingAbsence) {
      return NextResponse.json({ error: 'Отпуск/отсутствие не найдено' }, { status: 404 })
    }

    // Удаляем отпуск/отсутствие
    await prisma.masterAbsence.delete({
      where: {
        id: absenceId
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Отпуск/отсутствие успешно удалено'
    })

  } catch (error) {
    console.error('Absence delete error:', error)
    
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