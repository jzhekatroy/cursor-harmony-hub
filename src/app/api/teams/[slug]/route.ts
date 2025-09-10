import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Ищем команду по основному slug или по bookingSlug
    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { slug: slug },
          { bookingSlug: slug }
        ]
      },
      include: {
        serviceGroups: {
          include: {
            services: {
              where: { isArchived: false },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        services: {
          where: { 
            isArchived: false,
            groupId: null
          },
          orderBy: { order: 'asc' }
        },
        masters: {
          where: { isActive: true },
          include: {
            services: {
              where: { isArchived: false },
              select: {
                id: true,
                name: true,
                duration: true,
                price: true
              }
            },
            schedules: true,
            absences: {
              where: {
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
              }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' },
        { status: 404 }
      )
    }

    if (team.status === 'DISABLED') {
      return NextResponse.json(
        { error: 'Команда временно не принимает записи' },
        { status: 403 }
      )
    }

    // Публичные UX-настройки (через raw, так как поля могут отсутствовать в клиенте Prisma)
    let publicServiceCardsWithPhotos: boolean = true
    let publicTheme: string = 'light'
    let publicPageTitle: string | null = null
    let publicPageDescription: string | null = null
    let publicPageLogoUrl: string | null = null
    try {
      const rows: any[] = await prisma.$queryRaw`SELECT "publicPageTitle", "publicPageDescription", "publicPageLogoUrl" FROM "public"."teams" WHERE id = ${team.id} LIMIT 1`
      if (rows && rows[0]) {
        publicServiceCardsWithPhotos = true // по умолчанию
        publicTheme = 'light' // по умолчанию
        publicPageTitle = rows[0].publicPageTitle || null
        publicPageDescription = rows[0].publicPageDescription || null
        publicPageLogoUrl = rows[0].publicPageLogoUrl || null
      }
    } catch {}

    // Форматируем данные для фронтенда
    const formattedData = {
      team: {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        privacyPolicyUrl: team.privacyPolicyUrl,
        bookingStep: team.bookingStep,
        timezone: team.timezone || 'Europe/Moscow',
        publicServiceCardsWithPhotos: publicServiceCardsWithPhotos,
        publicTheme: publicTheme,
        publicPageTitle: publicPageTitle,
        publicPageDescription: publicPageDescription,
        publicPageLogoUrl: publicPageLogoUrl
      },
      serviceGroups: team.serviceGroups.map(group => ({
        id: group.id,
        name: group.name,
        services: group.services.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          duration: service.duration,
          price: Number(service.price),
          photoUrl: service.photoUrl
        }))
      })),
      ungroupedServices: team.services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: Number(service.price),
        photoUrl: service.photoUrl
      })),
      masters: team.masters.map(master => ({
        id: master.id,
        firstName: master.firstName,
        lastName: master.lastName,
        description: master.description,
        photoUrl: master.photoUrl,
        services: master.services.map(service => ({
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: Number(service.price)
        })),
        schedules: master.schedules,
        isAvailable: master.absences.length === 0
      }))
    }

    return NextResponse.json(formattedData)

  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}