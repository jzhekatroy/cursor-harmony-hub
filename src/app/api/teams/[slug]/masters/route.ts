import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRotatedMasters } from '@/lib/masterRotation'

// GET /api/teams/[slug]/masters - получить всех мастеров команды (публичный API)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Находим команду по slug
    const team = await prisma.team.findUnique({
      where: { slug }
    })

    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    // Получаем мастеров с их услугами
    const masters = await prisma.master.findMany({
      where: {
        teamId: team.id,
        isActive: true
      },
      include: {
        services: {
          where: {
            isArchived: false
          },
          select: {
            id: true,
            name: true,
            duration: true,
            price: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' }
      ]
    })

    // Преобразуем данные для удобства использования
    let processedMasters = masters.map(master => ({
      id: master.id,
      firstName: master.firstName,
      lastName: master.lastName,
      name: `${master.firstName} ${master.lastName}`,
      photoUrl: master.photoUrl,
      description: master.description,
      rating: master.rating,
      services: master.services.map(service => service.id) // Возвращаем только ID услуг
    }))

    // Применяем справедливое распределение мастеров, если включено
    if (team.fairMasterRotation && processedMasters.length > 1) {
      processedMasters = await getRotatedMasters(team.id, processedMasters)
    }

    return NextResponse.json(processedMasters)
  } catch (error) {
    console.error('Ошибка получения мастеров команды:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
