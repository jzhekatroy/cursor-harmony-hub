import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Проверяем, что это запрос с правильным ключом
    const { key } = await request.json()
    if (key !== 'regenerate-prisma-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Regenerating Prisma client...')

    // Пересоздаем клиент Prisma
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    try {
      await execAsync('npx prisma generate')
      console.log('✅ Prisma client regenerated successfully')
    } catch (error) {
      console.error('❌ Error regenerating Prisma client:', error)
      return NextResponse.json({ 
        error: 'Failed to regenerate Prisma client',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Prisma client regenerated successfully'
    })

  } catch (error) {
    console.error('❌ Regenerate Prisma error:', error)
    return NextResponse.json({ 
      error: 'Failed to regenerate Prisma client',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
