'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, Clock, User, MapPin, Phone, Mail, MessageCircle, Check } from 'lucide-react'
import DatePicker from '@/components/DatePicker'

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  photoUrl?: string
}

interface ServiceGroup {
  id: string
  name: string
  order: number
  services: Service[]
}

interface Master {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string
  description?: string
}

interface Team {
  id: string
  name: string
  logoUrl?: string
  privacyPolicyUrl?: string
  slug: string
}

export default function BookingWidget() {
  const params = useParams()
  const slug = params.slug as string

  const [team, setTeam] = useState<Team | null>(null)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [ungroupedServices, setUngroupedServices] = useState<Service[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<{start: string, end: string}[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [clientData, setClientData] = useState({
    email: '',
    phone: '',
    telegram: '',
    firstName: '',
    lastName: '',
    address: '',
    notes: '',
    agreeToTerms: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    loadTeamData()
  }, [slug])

  // Загружаем свободные слоты когда выбран мастер и дата
  useEffect(() => {
    if (selectedMaster && selectedDate) {
      loadAvailableSlots()
    } else {
      setAvailableSlots([])
      setSelectedTime('')
    }
  }, [selectedMaster, selectedDate, selectedServices])

  const loadAvailableSlots = async () => {
    if (!selectedMaster || !selectedDate) return

    setIsLoadingSlots(true)
    try {
      // Считаем общую длительность выбранных услуг
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)
      
      const response = await fetch(
        `/api/masters/${selectedMaster.id}/available-slots?date=${selectedDate}&duration=${totalDuration}`
      )
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки свободных слотов')
      }
      
      const data = await response.json()
      setAvailableSlots(data.availableSlots || [])
      
    } catch (error) {
      console.error('Ошибка загрузки слотов:', error)
      setAvailableSlots([])
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const loadTeamData = async () => {
    setIsLoadingData(true)
    setDataError(null)
    
    try {
      // Загружаем данные команды
      const teamResponse = await fetch(`/api/teams/${slug}`)
      if (!teamResponse.ok) {
        throw new Error('Команда не найдена')
      }
      
      const teamData = await teamResponse.json()
      setTeam(teamData.team)
      setMasters(teamData.masters || [])
      
      // Группируем услуги
      const groupedServices: ServiceGroup[] = []
      const ungrouped: Service[] = []
      
      // Обрабатываем сгруппированные услуги
      if (teamData.serviceGroups) {
        setServiceGroups(teamData.serviceGroups)
      }
      
      // Обрабатываем несгруппированные услуги
      if (teamData.ungroupedServices) {
        setUngroupedServices(teamData.ungroupedServices.map((service: any) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          duration: service.duration,
          price: parseFloat(service.price),
          photoUrl: service.photoUrl
        })))
      }
      
      // Старый код для совместимости (если API вернет services)
      if (teamData.services) {
        // Создаем группы
        const groupsMap = new Map<string, ServiceGroup>()
        
        teamData.services.forEach((service: any) => {
          if (service.group) {
            if (!groupsMap.has(service.group.id)) {
              groupsMap.set(service.group.id, {
                id: service.group.id,
                name: service.group.name,
                order: service.group.order,
                services: []
              })
            }
            groupsMap.get(service.group.id)!.services.push({
              id: service.id,
              name: service.name,
              description: service.description,
              duration: service.duration,
              price: parseFloat(service.price),
              photoUrl: service.photoUrl
            })
          } else {
            ungrouped.push({
              id: service.id,
              name: service.name,
              description: service.description,
              duration: service.duration,
              price: parseFloat(service.price),
              photoUrl: service.photoUrl
            })
          }
        })
        
        // Сортируем группы по порядку
        const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.order - b.order)
        setServiceGroups(sortedGroups)
        setUngroupedServices(ungrouped)
      }
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setDataError(error instanceof Error ? error.message : 'Ошибка загрузки данных')
    } finally {
      setIsLoadingData(false)
    }
  }

  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0)

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}ч ${mins}мин` : `${hours}ч`
    }
    return `${mins}мин`
  }

  const handleServiceToggle = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      if (isSelected) {
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, service]
      }
    })
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      // Создаем бронирование через API
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamSlug: slug,
          serviceIds: selectedServices.map(s => s.id),
          masterId: selectedMaster?.id,
          startTime: new Date(`${selectedDate}T${selectedTime}:00`).toISOString(),
          clientData
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsCompleted(true)
      } else {
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      alert('Ошибка соединения с сервером')
    } finally {
      setIsLoading(false)
    }
  }

  // Показываем загрузку данных
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  // Показываем ошибку загрузки данных
  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <h2 className="text-xl font-bold">Ошибка</h2>
            <p>{dataError}</p>
          </div>
          <button
            onClick={loadTeamData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  // Проверяем, что команда найдена
  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Команда не найдена</h2>
          <p className="text-gray-600">Проверьте правильность ссылки</p>
        </div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Запись успешно создана!</h2>
          <p className="text-gray-600 mb-6">
            Мы отправили подтверждение на указанный email. 
            Ожидайте подтверждения от администратора.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Дата:</span>
              <span className="font-medium">{new Date(selectedDate).toLocaleDateString('ru-RU')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Время:</span>
              <span className="font-medium">{selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Мастер:</span>
              <span className="font-medium">{selectedMaster?.firstName} {selectedMaster?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Сумма:</span>
              <span className="font-medium">{totalPrice} ₽</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-12 h-12 rounded-lg mr-4" />
            ) : (
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-blue-600 font-bold text-lg">{team.name[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-600">Онлайн запись</p>
            </div>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {[
              { number: 1, name: 'Услуги' },
              { number: 2, name: 'Мастер и время' },
              { number: 3, name: 'Контакты' }
            ].map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.number
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.number}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </span>
                {index < 2 && (
                  <div className={`w-12 h-px mx-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Step 1: Services */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Выберите услуги</h2>
                
                {serviceGroups.length === 0 && ungroupedServices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">У команды пока нет доступных услуг</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Услуги без группы */}
                    {ungroupedServices.length > 0 && (
                      <div className="grid gap-3">
                        {ungroupedServices.map((service) => {
                          const isSelected = selectedServices.some(s => s.id === service.id)
                          return (
                            <div
                              key={service.id}
                              onClick={() => handleServiceToggle(service)}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start">
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
                                      <div className="flex items-center mt-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {formatDuration(service.duration)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-900">{service.price} ₽</div>
                                  {isSelected && (
                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-2">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Группы услуг */}
                    {serviceGroups.map((group) => (
                      <div key={group.id}>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">{group.name}</h3>
                        <div className="grid gap-3">
                          {group.services.map((service) => {
                            const isSelected = selectedServices.some(s => s.id === service.id)
                            return (
                              <div
                                key={service.id}
                                onClick={() => handleServiceToggle(service)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex justify-between items-start">
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
                                        <div className="flex items-center mt-2 text-sm text-gray-500">
                                          <Clock className="w-4 h-4 mr-1" />
                                          {formatDuration(service.duration)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-900">{service.price} ₽</div>
                                    {isSelected && (
                                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-2">
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Master and time */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Выберите мастера</h2>
                  
                  {masters.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">У команды пока нет доступных мастеров</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {masters.map((master) => (
                        <div
                          key={master.id}
                          onClick={() => setSelectedMaster(master)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            selectedMaster?.id === master.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center">
                            {master.photoUrl ? (
                              <img src={master.photoUrl} alt={`${master.firstName} ${master.lastName}`} className="w-12 h-12 rounded-full object-cover mr-4" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                                <User className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {master.firstName} {master.lastName}
                              </h4>
                              {master.description && (
                                <p className="text-sm text-gray-600">{master.description}</p>
                              )}
                            </div>
                            {selectedMaster?.id === master.id && (
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedMaster && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Выберите дату и время</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Дата</label>
                        <DatePicker
                          selectedDate={selectedDate}
                          onDateSelect={setSelectedDate}
                          className="w-full"
                        />
                      </div>
                      {selectedDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Свободное время
                            {selectedServices.length > 0 && (
                              <span className="text-sm text-gray-500 ml-2">
                                (длительность: {selectedServices.reduce((sum, s) => sum + s.duration, 0)} мин)
                              </span>
                            )}
                          </label>
                          
                          {isLoadingSlots ? (
                            <div className="flex items-center justify-center py-4 border border-gray-300 rounded-md">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                              <span className="text-sm text-gray-600">Загружаем свободное время...</span>
                            </div>
                          ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {availableSlots.map((slot) => (
                                <button
                                  key={slot.start}
                                  onClick={() => setSelectedTime(slot.start)}
                                  className={`p-2 text-sm border rounded-md transition-colors ${
                                    selectedTime === slot.start
                                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                  }`}
                                >
                                  {slot.start}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 border border-gray-300 rounded-md bg-gray-50">
                              <p className="text-sm text-gray-600">
                                На выбранную дату нет свободного времени
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Попробуйте выбрать другую дату или мастера
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Contact info */}
            {currentStep === 3 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Контактная информация</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={clientData.email}
                      onChange={(e) => setClientData({...clientData, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Телефон *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientData.phone}
                      onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Имя
                    </label>
                    <input
                      type="text"
                      value={clientData.firstName}
                      onChange={(e) => setClientData({...clientData, firstName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      value={clientData.lastName}
                      onChange={(e) => setClientData({...clientData, lastName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telegram
                    </label>
                    <input
                      type="text"
                      value={clientData.telegram}
                      onChange={(e) => setClientData({...clientData, telegram: e.target.value})}
                      placeholder="@username"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Адрес
                    </label>
                    <input
                      type="text"
                      value={clientData.address}
                      onChange={(e) => setClientData({...clientData, address: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Примечания
                  </label>
                  <textarea
                    rows={3}
                    value={clientData.notes}
                    onChange={(e) => setClientData({...clientData, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Дополнительная информация..."
                  />
                </div>
                <div className="mt-6">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={clientData.agreeToTerms}
                      onChange={(e) => setClientData({...clientData, agreeToTerms: e.target.checked})}
                      className="mt-1 mr-3"
                    />
                    <span className="text-sm text-gray-600">
                      Я согласен на обработку персональных данных в соответствии с{' '}
                      <a href={team.privacyPolicyUrl || '/privacy'} className="text-blue-600 hover:underline">
                        политикой конфиденциальности
                      </a>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar with summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Сводка записи</h3>
              
              {selectedServices.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Услуги:</h4>
                  <div className="space-y-2">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{service.name}</span>
                        <span className="font-medium">{service.price} ₽</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMaster && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Мастер:</h4>
                  <p className="text-sm text-gray-600">
                    {selectedMaster.firstName} {selectedMaster.lastName}
                  </p>
                </div>
              )}

              {selectedDate && selectedTime && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Дата и время:</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedDate).toLocaleDateString('ru-RU')} в {selectedTime}
                  </p>
                </div>
              )}

              {totalDuration > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Общая продолжительность:</h4>
                  <p className="text-sm text-gray-600">{formatDuration(totalDuration)}</p>
                </div>
              )}

              {totalPrice > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Итого:</span>
                    <span className="text-xl font-bold text-gray-900">{totalPrice} ₽</span>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Назад
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={
                      (currentStep === 1 && selectedServices.length === 0) ||
                      (currentStep === 2 && (!selectedMaster || !selectedDate || !selectedTime))
                    }
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Продолжить
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={
                      !clientData.email || 
                      !clientData.phone || 
                      !clientData.agreeToTerms ||
                      isLoading
                    }
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Создание записи...' : 'Записаться'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}