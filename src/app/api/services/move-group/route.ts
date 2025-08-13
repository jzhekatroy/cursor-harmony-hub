import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// POST /api/services/move-group - перенести все услуги из одной группы в другую (или в "Без группы")
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const body = await request.json()
    const { fromGroupId, toGroupId } = body as { fromGroupId: string; toGroupId?: string | null }

    if (!fromGroupId) {
      return NextResponse.json({ error: 'fromGroupId обязателен' }, { status: 400 })
    }

    // Проверим, что исходная группа принадлежит команде
    const fromGroup = await prisma.serviceGroup.findFirst({
      where: { id: fromGroupId, teamId: decoded.teamId }
    })
    if (!fromGroup) {
      return NextResponse.json({ error: 'Исходная группа не найдена' }, { status: 404 })
    }

    // Если указан toGroupId, проверим её принадлежность команде
    let finalToGroupId: string | null = null
    if (toGroupId) {
      const toGroup = await prisma.serviceGroup.findFirst({
        where: { id: toGroupId, teamId: decoded.teamId }
      })
      if (!toGroup) {
        return NextResponse.json({ error: 'Целевая группа не найдена' }, { status: 404 })
      }
      finalToGroupId = toGroup.id
    }

    // Переносим все услуги из fromGroupId в finalToGroupId (или в Без группы, если null)
    await prisma.service.updateMany({
      where: { groupId: fromGroupId },
      data: { groupId: finalToGroupId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка переноса услуг между группами:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}


