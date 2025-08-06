import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyToken } from '@/lib/auth'

// PUT /api/services/[id]/masters - обновить привязку мастеров к услуге
export async function PUT(
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
    const { masterIds = [] } = body

    console.log('Service masters update:', { serviceId: id, masterIds })

    // Проверяем, что услуга принадлежит команде
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Услуга не найдена' }, { status: 404 })
    }

    // Проверяем, что все указанные мастера принадлежат команде
    if (masterIds.length > 0) {
      const mastersCount = await prisma.master.count({
        where: {
          id: { in: masterIds },
          teamId: decoded.teamId,
          isActive: true
        }
      })
      
      if (mastersCount !== masterIds.length) {
        console.error('Masters validation failed:', { masterIds, mastersCount, teamId: decoded.teamId })
        return NextResponse.json({ error: 'Некоторые мастера не принадлежат вашей команде' }, { status: 400 })
      }
    }

    // Обновляем привязку мастеров к услуге
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        masters: {
          set: masterIds.map((masterId: string) => ({ id: masterId }))
        }
      },
      include: {
        masters: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      service: updatedService 
    })

  } catch (error) {
    console.error('Service masters update error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}