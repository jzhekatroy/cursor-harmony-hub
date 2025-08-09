import { prisma } from '@/lib/prisma'

/**
 * Алгоритм справедливого распределения мастеров
 * 
 * Принцип работы:
 * 1. Отслеживаем количество показов каждого мастера на каждой позиции
 * 2. При каждом запросе перестраиваем порядок так, чтобы выровнять показы
 * 3. Мастера с меньшим количеством показов на текущих позициях получают приоритет
 */

interface MasterWithRotation {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  services?: string[]
  showCount: number
  position: number
}

/**
 * Получает отсортированный список мастеров с учетом справедливого распределения
 */
export async function getRotatedMasters(teamId: string, masters: any[]): Promise<any[]> {
  try {
    // Получаем данные о ротации для всех мастеров команды
    const rotations = await prisma.masterRotation.findMany({
      where: { teamId },
      orderBy: [
        { position: 'asc' },
        { showCount: 'asc' },
        { lastShownAt: 'asc' }
      ]
    })

    // Создаем Map для быстрого поиска данных ротации
    const rotationMap = new Map<string, { position: number; showCount: number; lastShownAt: Date }>()
    rotations.forEach(rotation => {
      rotationMap.set(rotation.masterId, {
        position: rotation.position,
        showCount: rotation.showCount,
        lastShownAt: rotation.lastShownAt
      })
    })

    // Добавляем данные ротации к мастерам
    const mastersWithRotation: MasterWithRotation[] = masters.map((master, index) => {
      const rotation = rotationMap.get(master.id)
      return {
        ...master,
        showCount: rotation?.showCount || 0,
        position: rotation?.position || index
      }
    })

    // Алгоритм справедливого распределения:
    // 1. Группируем мастеров по количеству показов
    // 2. Внутри каждой группы сортируем по времени последнего показа
    // 3. Перемешиваем группы чтобы избежать предсказуемости
    
    const mastersByShowCount = new Map<number, MasterWithRotation[]>()
    mastersWithRotation.forEach(master => {
      const count = master.showCount
      if (!mastersByShowCount.has(count)) {
        mastersByShowCount.set(count, [])
      }
      mastersByShowCount.get(count)!.push(master)
    })

    // Получаем уникальные счетчики показов и сортируем по возрастанию
    const showCounts = Array.from(mastersByShowCount.keys()).sort((a, b) => a - b)
    
    // Строим итоговый массив: сначала мастера с меньшим количеством показов
    const result: any[] = []
    
    showCounts.forEach(count => {
      const mastersInGroup = mastersByShowCount.get(count)!
      
      // Внутри группы сортируем по позиции, чтобы соблюсти ротацию позиций
      mastersInGroup.sort((a, b) => {
        // Сначала по позиции
        if (a.position !== b.position) {
          return a.position - b.position
        }
        // Затем по времени последнего показа (давно показанные вперед)
        return new Date(rotationMap.get(a.id)?.lastShownAt || 0).getTime() - 
               new Date(rotationMap.get(b.id)?.lastShownAt || 0).getTime()
      })
      
      // Для справедливости ротируем порядок внутри группы
      if (mastersInGroup.length > 1) {
        const rotationShift = Date.now() % mastersInGroup.length
        const rotated = [
          ...mastersInGroup.slice(rotationShift),
          ...mastersInGroup.slice(0, rotationShift)
        ]
        result.push(...rotated)
      } else {
        result.push(...mastersInGroup)
      }
    })

    // Обновляем статистику ротации
    await updateRotationStats(teamId, result)

    return result.map(master => {
      const { showCount, position, ...masterData } = master
      return masterData
    })

  } catch (error) {
    console.error('Ошибка в алгоритме ротации мастеров:', error)
    // В случае ошибки возвращаем исходный список
    return masters
  }
}

/**
 * Обновляет статистику показов для мастеров
 */
async function updateRotationStats(teamId: string, sortedMasters: MasterWithRotation[]) {
  try {
    const now = new Date()

    // Обновляем или создаем записи ротации для каждого мастера
    const updates = sortedMasters.map((master, newPosition) => {
      return prisma.masterRotation.upsert({
        where: {
          teamId_masterId: {
            teamId,
            masterId: master.id
          }
        },
        update: {
          position: newPosition,
          showCount: { increment: 1 },
          lastShownAt: now
        },
        create: {
          teamId,
          masterId: master.id,
          position: newPosition,
          showCount: 1,
          lastShownAt: now
        }
      })
    })

    await Promise.all(updates)

  } catch (error) {
    console.error('Ошибка обновления статистики ротации:', error)
  }
}

/**
 * Инициализирует ротацию для новых мастеров команды
 */
export async function initializeMasterRotation(teamId: string, masterId: string, position?: number) {
  try {
    const existingRotation = await prisma.masterRotation.findUnique({
      where: {
        teamId_masterId: {
          teamId,
          masterId
        }
      }
    })

    if (!existingRotation) {
      // Если позиция не указана, определяем следующую доступную
      if (position === undefined) {
        const maxPosition = await prisma.masterRotation.findFirst({
          where: { teamId },
          orderBy: { position: 'desc' }
        })
        position = (maxPosition?.position || -1) + 1
      }

      await prisma.masterRotation.create({
        data: {
          teamId,
          masterId,
          position,
          showCount: 0,
          lastShownAt: new Date()
        }
      })
    }
  } catch (error) {
    console.error('Ошибка инициализации ротации мастера:', error)
  }
}

/**
 * Удаляет данные ротации при удалении мастера
 */
export async function cleanupMasterRotation(teamId: string, masterId: string) {
  try {
    await prisma.masterRotation.delete({
      where: {
        teamId_masterId: {
          teamId,
          masterId
        }
      }
    })
  } catch (error) {
    console.error('Ошибка очистки ротации мастера:', error)
  }
}

/**
 * Сбрасывает статистику ротации для команды
 */
export async function resetRotationStats(teamId: string) {
  try {
    await prisma.masterRotation.updateMany({
      where: { teamId },
      data: {
        showCount: 0,
        lastShownAt: new Date()
      }
    })
  } catch (error) {
    console.error('Ошибка сброса статистики ротации:', error)
  }
}
