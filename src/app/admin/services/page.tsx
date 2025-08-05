'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Upload } from 'lucide-react'

interface ServiceGroup {
  id: string
  name: string
  order: number
  services: Service[]
}

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  photoUrl?: string
  isArchived: boolean
  order: number
  groupId?: string
}

export default function ServicesPage() {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null)
  const [isCreatingService, setIsCreatingService] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

  // Форма для услуги
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    photoUrl: '',
    groupId: ''
  })

  // Форма для группы
  const [groupForm, setGroupForm] = useState({
    name: '',
    order: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Загружаем группы услуг
      const groupsResponse = await fetch('/api/service-groups')
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setServiceGroups(groupsData)
      }

      // Загружаем услуги
      const servicesResponse = await fetch('/api/services')
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        setServices(servicesData)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveService = async () => {
    try {
      const url = editingService ? `/api/services/${editingService.id}` : '/api/services'
      const method = editingService ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(serviceForm)
      })

      if (response.ok) {
        await loadData()
        setEditingService(null)
        setIsCreatingService(false)
        setServiceForm({ name: '', description: '', duration: 60, price: 0, photoUrl: '', groupId: '' })
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.message}`)
      }
    } catch (error) {
      alert('Ошибка соединения с сервером')
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        await loadData()
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.message}`)
      }
    } catch (error) {
      alert('Ошибка соединения с сервером')
    }
  }

  const handleSaveGroup = async () => {
    try {
      const url = editingGroup ? `/api/service-groups/${editingGroup.id}` : '/api/service-groups'
      const method = editingGroup ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(groupForm)
      })

      if (response.ok) {
        await loadData()
        setEditingGroup(null)
        setIsCreatingGroup(false)
        setGroupForm({ name: '', order: 0 })
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.message}`)
      }
    } catch (error) {
      alert('Ошибка соединения с сервером')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Вы уверены? Все услуги из этой группы будут перемещены в "Без группы".')) return

    try {
      const response = await fetch(`/api/service-groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        await loadData()
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.message}`)
      }
    } catch (error) {
      alert('Ошибка соединения с сервером')
    }
  }

  const startEditingService = (service: Service) => {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      photoUrl: service.photoUrl || '',
      groupId: service.groupId || ''
    })
  }

  const startEditingGroup = (group: ServiceGroup) => {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      order: group.order
    })
  }

  const startCreatingService = () => {
    setIsCreatingService(true)
    setServiceForm({ name: '', description: '', duration: 60, price: 0, photoUrl: '', groupId: '' })
  }

  const startCreatingGroup = () => {
    setIsCreatingGroup(true)
    setGroupForm({ name: '', order: serviceGroups.length })
  }

  const cancelEditing = () => {
    setEditingService(null)
    setEditingGroup(null)
    setIsCreatingService(false)
    setIsCreatingGroup(false)
    setServiceForm({ name: '', description: '', duration: 60, price: 0, photoUrl: '', groupId: '' })
    setGroupForm({ name: '', order: 0 })
  }

  // Группируем услуги по группам
  const groupedServices = serviceGroups.map(group => ({
    ...group,
    services: services.filter(service => service.groupId === group.id)
  }))

  // Услуги без группы
  const ungroupedServices = services.filter(service => !service.groupId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Управление услугами</h1>
        <div className="flex space-x-3">
          <button
            onClick={startCreatingGroup}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить группу
          </button>
          <button
            onClick={startCreatingService}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить услугу
          </button>
        </div>
      </div>

      {/* Форма создания/редактирования группы */}
      {(isCreatingGroup || editingGroup) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingGroup ? 'Редактировать группу' : 'Новая группа'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название группы *
              </label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Например: Парикмахерские услуги"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Порядок отображения
              </label>
              <input
                type="number"
                value={groupForm.order}
                onChange={(e) => setGroupForm({...groupForm, order: parseInt(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveGroup}
              disabled={!groupForm.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Форма создания/редактирования услуги */}
      {(isCreatingService || editingService) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingService ? 'Редактировать услугу' : 'Новая услуга'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название услуги *
              </label>
              <input
                type="text"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Например: Стрижка женская"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Группа
              </label>
              <select
                value={serviceForm.groupId}
                onChange={(e) => setServiceForm({...serviceForm, groupId: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Без группы</option>
                {serviceGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Продолжительность (мин) *
              </label>
              <input
                type="number"
                value={serviceForm.duration}
                onChange={(e) => setServiceForm({...serviceForm, duration: parseInt(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="15"
                step="15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цена (₽) *
              </label>
              <input
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({...serviceForm, price: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="0"
                step="100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Описание услуги..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL фотографии
              </label>
              <input
                type="url"
                value={serviceForm.photoUrl}
                onChange={(e) => setServiceForm({...serviceForm, photoUrl: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveService}
              disabled={!serviceForm.name || !serviceForm.duration || !serviceForm.price}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Список групп и услуг */}
      <div className="space-y-6">
        {/* Услуги без группы */}
        {ungroupedServices.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Без группы</h3>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                {ungroupedServices.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center">
                        {service.photoUrl && (
                          <img src={service.photoUrl} alt={service.name} className="w-12 h-12 rounded-lg object-cover mr-4" />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{service.duration} мин</span>
                            <span>{service.price} ₽</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEditingService(service)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Группы с услугами */}
        {groupedServices.map(group => (
          <div key={group.id} className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => startEditingGroup(group)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {group.services.length > 0 ? (
                <div className="grid gap-4">
                  {group.services.map(service => (
                    <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center">
                          {service.photoUrl && (
                            <img src={service.photoUrl} alt={service.name} className="w-12 h-12 rounded-lg object-cover mr-4" />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                            {service.description && (
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>{service.duration} мин</span>
                              <span>{service.price} ₽</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditingService(service)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">В этой группе пока нет услуг</p>
              )}
            </div>
          </div>
        ))}

        {serviceGroups.length === 0 && ungroupedServices.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">У вас пока нет услуг</p>
            <button
              onClick={startCreatingService}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Добавить первую услугу
            </button>
          </div>
        )}
      </div>
    </div>
  )
}