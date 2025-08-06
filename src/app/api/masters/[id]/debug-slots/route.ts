import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DEBUG - упрощенная версия для диагностики
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD format
    const serviceDuration = parseInt(searchParams.get('duration') || '60') // минуты

    if (!date) {
      return NextResponse.json(
        { error: 'Параметр date обязателен' },
        { status: 400 }
      )
    }

    const resolvedParams = await params
    const masterId = resolvedParams.id

    // Проверяем существование мастера
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      include: {
        team: true,
        schedules: true,
        absences: true,
        bookings: {
          where: {
            startTime: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`)
            },
            status: {
              not: 'CANCELLED_BY_CLIENT'
            }
          }
        }
      }
    })

    if (!master) {
      return NextResponse.json(
        { error: 'Мастер не найден', masterId },
        { status: 404 }
      )
    }

    // Возвращаем отладочную информацию
    return NextResponse.json({
      debug: true,
      masterId,
      masterName: `${master.firstName} ${master.lastName}`,
      isActive: master.isActive,
      date,
      serviceDuration,
      bookingStep: master.team.bookingStep,
      schedulesCount: master.schedules.length,
      schedules: master.schedules.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        breakStart: s.breakStart,
        breakEnd: s.breakEnd
      })),
      absencesCount: master.absences.length,
      absences: master.absences.map(a => ({
        startDate: a.startDate,
        endDate: a.endDate,
        reason: a.reason
      })),
      bookingsCount: master.bookings.length,
      bookings: master.bookings.map(b => ({
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status
      }))
    })

  } catch (error) {
    console.error('Ошибка отладочного API:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    
    return NextResponse.json(
      { 
        error: 'Ошибка отладочного API',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}