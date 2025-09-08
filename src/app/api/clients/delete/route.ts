import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyToken(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientIds } = await request.json()
    
    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Не указаны ID клиентов для удаления' }, { status: 400 })
    }

    // Проверяем, что все клиенты принадлежат к команде пользователя
    const clients = await prisma.client.findMany({
      where: {
        id: { in: clientIds },
        teamId: payload.teamId
      },
      select: { id: true, firstName: true, lastName: true }
    })

    if (clients.length !== clientIds.length) {
      return NextResponse.json({ error: 'Некоторые клиенты не найдены или не принадлежат вашей команде' }, { status: 400 })
    }

    // Удаляем клиентов (каскадное удаление удалит связанные записи)
    await prisma.client.deleteMany({
      where: {
        id: { in: clientIds },
        teamId: payload.teamId
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Удалено клиентов: ${clients.length}`,
      deletedClients: clients.map(c => ({ id: c.id, name: `${c.lastName} ${c.firstName}`.trim() || 'Без имени' }))
    })

  } catch (error) {
    console.error('Error deleting clients:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
