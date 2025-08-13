'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, UserMinus, UserCheck, Eye, EyeOff, Camera, Clock, Calendar, X } from 'lucide-react'
import MasterSchedule from '@/components/MasterSchedule'
import PhotoUpload from '@/components/PhotoUpload'
import MasterLimitSettings from '@/components/MasterLimitSettings'
import MasterAbsencesManager from '@/components/MasterAbsencesManager'

interface Master {
  id: string
  firstName: string
  lastName: string
  description: string | null
  photoUrl: string | null
  isActive: boolean
  createdAt: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    isActive: boolean
    lastLoginAt: string | null
  }
  services: {
    id: string
    name: string
  }[]
  _count: {
    bookings: number
  }
}

interface Service {
  id: string
  name: string
  isArchived?: boolean
}

interface ScheduleItem {
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
}

interface Absence {
  id: string
  startDate: string
  endDate: string
  reason?: string
}

export default function MastersPage() {
  const [masters, setMasters] = useState<Master[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Состояния для форм
  const [editingMaster, setEditingMaster] = useState<Master | null>(null)
  const [isCreatingMaster, setIsCreatingMaster] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  
  // Табы внутри редактирования мастера
  const [activeEditTab, setActiveEditTab] = useState<'profile' | 'schedule' | 'absences'>('profile')
  
  // Состояния формы
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    description: '',
    photoUrl: '',
    serviceIds: [] as string[]
  })

  const [masterLimit, setMasterLimit] = useState(2)
  const [activeMastersCount, setActiveMastersCount] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  // Функция для сохранения лимита мастеров
  const handleLimitChange = async (newLimit: number) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/team/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          masterLimit: newLimit
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка сохранения лимита')
      }

      setMasterLimit(newLimit)
      
    } catch (error) {
      console.error('Ошибка сохранения лимита:', error)
      setError(error instanceof Error ? error.message : 'Ошибка сохранения лимита')
    }
  }

  // Загрузка данных
  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Токен авторизации отсутствует')
        return
      }

      // Загружаем мастеров и услуги параллельно
      const [mastersResponse, servicesResponse] = await Promise.all([
        fetch('/api/masters', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/services?includeArchived=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (!mastersResponse.ok) {
        const errorData = await mastersResponse.json()
        throw new Error(errorData.error || 'Ошибка загрузки мастеров')
      }

      if (!servicesResponse.ok) {
        const errorData = await servicesResponse.json()
        throw new Error(errorData.error || 'Ошибка загрузки услуг')
      }

      const mastersData = await mastersResponse.json()
      const servicesData = await servicesResponse.json()
      
      setMasters(mastersData.masters || [])
      setServices((servicesData.services || servicesData || []).map((s: any) => ({ id: s.id, name: s.name, isArchived: Boolean(s.isArchived) })))
      setActiveMastersCount(mastersData.masters?.filter((m: Master) => m.isActive).length || 0)

    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Сохранение мастера
  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Имя и фамилия обязательны для заполнения')
      return
    }

    // Email/пароль больше не обязательны: сервер сгенерирует при необходимости

    try {
      setError(null)
      const token = localStorage.getItem('token')
      
      const url = editingMaster ? `/api/masters/${editingMaster.id}` : '/api/masters'
      const method = editingMaster ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          description: formData.description.trim() || null,
          photoUrl: formData.photoUrl.trim() || null,
          serviceIds: formData.serviceIds
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка сохранения мастера')
      }

      await loadData()
      cancelEditing()
      
    } catch (error) {
      console.error('Ошибка сохранения мастера:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    }
  }

  // Увольнение/восстановление мастера
  const handleToggleMasterStatus = async (master: Master) => {
    if (!confirm(`Вы уверены, что хотите ${master.isActive ? 'уволить' : 'восстановить'} мастера ${master.firstName} ${master.lastName}?`)) {
      return
    }

    try {
      setError(null)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/masters/${master.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isActive: !master.isActive
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка изменения статуса мастера')
      }

      await loadData()
      
    } catch (error) {
      console.error('Ошибка изменения статуса мастера:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    }
  }

  // Управление формой
  const startEditingMaster = (master: Master) => {
    setEditingMaster(master)
    setActiveEditTab('profile')
    setFormData({
      firstName: master.firstName,
      lastName: master.lastName,
      description: master.description || '',
      photoUrl: master.photoUrl || '',
      serviceIds: master.services.map(s => s.id)
    })
    setIsCreatingMaster(false)
    setError(null)
  }

  const startCreatingMaster = () => {
    if (activeMastersCount >= masterLimit) {
      setError(`Достигнут лимит мастеров (${masterLimit}). Обратитесь к администратору для увеличения лимита.`)
      return
    }
    
    setIsCreatingMaster(true)
    setEditingMaster(null)
    setActiveEditTab('profile')
    setFormData({ firstName: '', lastName: '', description: '', photoUrl: '', serviceIds: [] })
    setError(null)
  }

  const cancelEditing = () => {
    setEditingMaster(null)
    setIsCreatingMaster(false)
    setFormData({ firstName: '', lastName: '', description: '', photoUrl: '', serviceIds: [] })
    setError(null)
  }

  // Фильтрация мастеров
  const filteredMasters = masters.filter(master => 
    showInactive ? !master.isActive : master.isActive
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка мастеров...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Управление мастерами
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Активных мастеров: {activeMastersCount} из {masterLimit}
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {showInactive ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {showInactive ? 'Показать активных' : 'Показать уволенных'}
            </button>
            <button
              onClick={startCreatingMaster}
              disabled={activeMastersCount >= masterLimit}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить мастера
            </button>
          </div>
        </div>

        {/* Настройки лимита мастеров */}
        <div className="mt-6">
          <MasterLimitSettings
            currentLimit={masterLimit}
            activeMastersCount={activeMastersCount}
            onLimitChange={handleLimitChange}
            disabled
          />
        </div>

        {/* Ошибки */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Форма создания/редактирования */}
        {(isCreatingMaster || editingMaster) && (
          <div className="mt-6 bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {editingMaster ? 'Редактировать мастера' : 'Добавить мастера'}
              </h3>
              {editingMaster && (
                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveEditTab('profile')}
                    className={`px-3 py-1.5 rounded-md text-sm ${activeEditTab === 'profile' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Профиль
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditTab('schedule')}
                    className={`px-3 py-1.5 rounded-md text-sm ${activeEditTab === 'schedule' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Расписание
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditTab('absences')}
                    className={`px-3 py-1.5 rounded-md text-sm ${activeEditTab === 'absences' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Отсутствия
                  </button>
                </div>
              )}
              
              {(!editingMaster || activeEditTab === 'profile') && (
                <form ref={formRef} onSubmit={handleSaveMaster} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <PhotoUpload
                        currentPhotoUrl={formData.photoUrl}
                        onPhotoChange={(photoUrl) => setFormData({...formData, photoUrl})}
                        onPhotoRemove={() => setFormData({...formData, photoUrl: ''})}
                      />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Имя *</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Фамилия *</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Описание</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Опыт работы, специализация, достижения..."
                    />
                  </div>

                  <div className="pb-24 md:pb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Услуги мастера</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                      {services.filter(s => !s.isArchived).map((service) => (
                        <label key={service.id} className="flex items-center py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.serviceIds.includes(service.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, serviceIds: [...formData.serviceIds, service.id] })
                              } else {
                                setFormData({ ...formData, serviceIds: formData.serviceIds.filter(id => id !== service.id) })
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                          />
                          <span className="ml-2 text-sm text-gray-700">{service.name}</span>
                        </label>
                      ))}
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer select-none">Услуги в архиве</summary>
                      <div className="mt-2 grid grid-cols-2 gap-2 max-h-28 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50">
                        {services.filter(s => s.isArchived).map((service) => (
                          <label key={service.id} className="flex items-center opacity-70 py-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.serviceIds.includes(service.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, serviceIds: [...formData.serviceIds, service.id] })
                                } else {
                                  setFormData({ ...formData, serviceIds: formData.serviceIds.filter(id => id !== service.id) })
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                            />
                            <span className="ml-2 text-sm text-gray-600">{service.name}</span>
                          </label>
                        ))}
                        {services.filter(s => s.isArchived).length === 0 && (
                          <div className="text-xs text-gray-400">Архивных услуг нет</div>
                        )}
                      </div>
                    </details>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button type="button" onClick={cancelEditing} className="px-4 py-2 min-h-[44px] border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Отмена</button>
                    <button type="submit" className="px-4 py-2 min-h-[44px] border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingMaster ? 'Сохранить' : 'Добавить'}</button>
                  </div>
                </form>
              )}

              {editingMaster && activeEditTab === 'schedule' && (
                <div className="mt-2">
                  <MasterSchedule
                    masterId={editingMaster.id}
                    isOpen={true}
                    onClose={() => {}}
                    onSave={() => { loadData() }}
                    embedded
                  />
                </div>
              )}

              {editingMaster && activeEditTab === 'absences' && (
                <div className="mt-2">
                  <MasterAbsencesManager
                    masterId={editingMaster.id}
                    masterName={`${editingMaster.firstName} ${editingMaster.lastName}`}
                    onClose={() => {}}
                    embedded
                  />
                </div>
              )}
            </div>
            {/* FAB Сохранить на мобильных */}
            <div className="md:hidden">
              <div className="fixed bottom-20 right-5 z-40">
                <button
                  onClick={() => formRef.current?.requestSubmit()}
                  className="rounded-full bg-blue-600 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-14 h-14 flex items-center justify-center"
                  title="Сохранить"
                >
                  ✓
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Список мастеров */}
        <div className="mt-8">
          {filteredMasters.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {showInactive ? 'Нет уволенных мастеров' : 'Нет активных мастеров'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {showInactive 
                      ? 'Все мастера активны и работают.' 
                      : 'Начните с добавления первого мастера в вашу команду.'
                    }
                  </p>
                  {!showInactive && activeMastersCount < masterLimit && (
                    <div className="mt-6">
                      <button
                        onClick={startCreatingMaster}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить первого мастера
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredMasters.map((master) => (
                  <li key={master.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {master.photoUrl ? (
                              <img
                                className="h-12 w-12 rounded-full object-cover"
                                src={master.photoUrl}
                                alt={`${master.firstName} ${master.lastName}`}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                <Camera className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">
                                {master.firstName} {master.lastName}
                              </p>
                              {!master.isActive && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Уволен
                                </span>
                              )}
                            </div>
                            {/* Убрали показ email */}
                            {master.description && (
                              <p className="text-sm text-gray-600 mt-1">{master.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {master.services.map((service) => (
                                <span
                                  key={service.id}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {service.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEditingMaster(master)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="Редактировать"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleMasterStatus(master)}
                            className={`p-2 ${master.isActive ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                            title={master.isActive ? 'Уволить' : 'Восстановить'}
                          >
                            {master.isActive ? (
                              <UserMinus className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}