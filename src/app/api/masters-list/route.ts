import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const masters = await prisma.master.findMany({
      where: { isActive: true },
      include: {
        team: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    const mastersList = masters.map(master => ({
      id: master.id,
      name: `${master.firstName} ${master.lastName}`,
      team: master.team.name,
      teamSlug: master.team.slug,
      debugUrl: `http://test.2minutes.ru/api/debug-slots?masterId=${master.id}&date=${new Date().toISOString().split('T')[0]}&duration=60`
    }))

    return NextResponse.json({
      total: mastersList.length,
      masters: mastersList,
      instruction: "Скопируйте debugUrl для нужного мастера и откройте в браузере"
    })
  } catch (error) {
    console.error('Ошибка получения списка мастеров:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
}