import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/teams/[slug]/services - получить все услуги команды (публичный API)
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

    // Получаем группы услуг с услугами
    const serviceGroups = await prisma.serviceGroup.findMany({
      where: {
        teamId: team.id
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

    // Получаем услуги без группы (напрямую привязанные к команде)
    const servicesWithoutGroup = await prisma.service.findMany({
      where: {
        teamId: team.id,
        isArchived: false,
        groupId: null
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    // Если есть услуги без группы, создаем для них виртуальную группу
    const allServiceGroups = [...serviceGroups]
    if (servicesWithoutGroup.length > 0) {
      allServiceGroups.push({
        id: 'ungrouped',
        name: 'Услуги',
        order: 999,
        createdAt: new Date(),
        updatedAt: new Date(),
        teamId: team.id,
        services: servicesWithoutGroup
      })
    }

    // Преобразуем цены из Decimal в number
    const processedServiceGroups = allServiceGroups.map(group => ({
      ...group,
      services: group.services.map(service => ({
        ...service,
        price: Number(service.price),
        description: service.description || ''
      }))
    }))

    return NextResponse.json(processedServiceGroups)
  } catch (error) {
    console.error('Ошибка получения услуг команды:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
