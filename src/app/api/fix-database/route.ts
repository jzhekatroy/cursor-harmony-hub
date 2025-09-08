import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Проверяем, что это запрос с правильным ключом
    const { key } = await request.json()
    if (key !== 'fix-db-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 Starting database fix...')

    // Проверяем, существует ли колонка action_type
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_actions' 
      AND column_name = 'action_type'
    `

    console.log('📊 action_type column exists:', result)

    // Если колонка не существует, создаем её
    if (!result || (result as any[]).length === 0) {
      console.log('🔨 Creating action_type column...')
      
      await prisma.$executeRaw`
        ALTER TABLE client_actions 
        ADD COLUMN action_type VARCHAR(50) DEFAULT 'PAGE_VIEW'
      `
      
      console.log('✅ action_type column created')
    }

    // Проверяем, существует ли колонка actionType
    const result2 = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_actions' 
      AND column_name = 'actionType'
    `

    console.log('📊 actionType column exists:', result2)

    // Если колонка actionType существует, удаляем её
    if (result2 && (result2 as any[]).length > 0) {
      console.log('🗑️ Removing actionType column...')
      
      await prisma.$executeRaw`
        ALTER TABLE client_actions 
        DROP COLUMN "actionType"
      `
      
      console.log('✅ actionType column removed')
    }

    // Проверяем финальное состояние
    const finalResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_actions' 
      AND column_name IN ('action_type', 'actionType')
    `

    console.log('🎯 Final state:', finalResult)

    return NextResponse.json({ 
      success: true, 
      message: 'Database fixed successfully',
      columns: finalResult
    })

  } catch (error) {
    console.error('❌ Database fix error:', error)
    return NextResponse.json({ 
      error: 'Failed to fix database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
