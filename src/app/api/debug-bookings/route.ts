import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const masterId = searchParams.get('masterId')

  try {
    // Получаем ВСЕ бронирования для мастера (без фильтров)
    const allBookings = await prisma.booking.findMany({
      where: masterId ? { masterId } : {},
      include: {
        master: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        client: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        },
        services: {
          include: {
            service: {
              select: {
                name: true,
                duration: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 50 // Последние 50 бронирований
    })

    // Получаем все статусы бронирований
    const statusCounts = await prisma.booking.groupBy({
      by: ['status'],
      _count: {
        status: true
      },
      where: masterId ? { masterId } : {}
    })

    // Форматируем данные для анализа
    const formattedBookings = allBookings.map(booking => ({
      id: booking.id,
      masterName: `${booking.master.firstName} ${booking.master.lastName}`,
      clientName: booking.client ? `${booking.client.firstName} ${booking.client.lastName}` : 'Не указан',
      clientEmail: booking.client?.email || 'Не указан',
      services: booking.services.map(s => `${s.service.name} (${s.service.duration}мин)`),
      startTime: {
        raw: booking.startTime.toISOString(),
        formatted: booking.startTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
        date: booking.startTime.toISOString().split('T')[0],
        time: booking.startTime.toTimeString().slice(0, 5)
      },
      endTime: {
        raw: booking.endTime.toISOString(),
        formatted: booking.endTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
        time: booking.endTime.toTimeString().slice(0, 5)
      },
      status: booking.status,
      createdAt: booking.createdAt.toISOString()
    }))

    // Группируем по датам
    const bookingsByDate = formattedBookings.reduce((acc, booking) => {
      const date = booking.startTime.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(booking)
      return acc
    }, {} as Record<string, typeof formattedBookings>)

    // Анализ времени хранения
    const timezoneAnalysis = allBookings.map(booking => {
      const utcTime = booking.startTime.toISOString()
      const moscowTime = booking.startTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
      const localTime = booking.startTime.toString()
      
      return {
        id: booking.id,
        utc: utcTime,
        moscow: moscowTime,
        local: localTime,
        timezoneOffset: booking.startTime.getTimezoneOffset()
      }
    })

    return NextResponse.json({
      summary: {
        total: allBookings.length,
        requestedMaster: masterId,
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>)
      },
      bookingsByDate,
      allBookings: formattedBookings,
      timezoneAnalysis: timezoneAnalysis.slice(0, 10), // Первые 10 для анализа
      debug: {
        searchDate: '2025-01-15',
        filters: {
          moscowTimeRange: {
            start: new Date('2025-01-15T00:00:00+03:00').toISOString(),
            end: new Date('2025-01-15T23:59:59+03:00').toISOString()
          },
          utcTimeRange: {
            start: new Date('2025-01-15T00:00:00.000Z').toISOString(),
            end: new Date('2025-01-15T23:59:59.999Z').toISOString()
          }
        }
      }
    })
  } catch (error) {
    console.error('Ошибка debug bookings API:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
}