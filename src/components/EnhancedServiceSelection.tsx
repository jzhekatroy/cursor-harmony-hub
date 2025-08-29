'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Clock, Check, X, ArrowRight, Sparkles } from 'lucide-react'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { Service, ServiceGroup } from '@/types/booking'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface EnhancedServiceSelectionProps {
  serviceGroups: ServiceGroup[];
  selectedServices: Service[];
  onServiceSelect: (services: Service[]) => void;
  onNext?: () => void;
  className?: string;
  showImagesOverride?: boolean; // принудительный режим «с фото/без фото» из настроек команды
}

// Упрощённый UI: без переключателя вида и фильтра по цене

export function EnhancedServiceSelection({
  serviceGroups,
  selectedServices,
  onServiceSelect,
  onNext,
  className = '',
  showImagesOverride
}: EnhancedServiceSelectionProps) {
  console.log('🔍 EnhancedServiceSelection: render with props:', {
    serviceGroups: serviceGroups?.length,
    selectedServices: selectedServices?.length,
    onNext: !!onNext
  });
  
  // Поиск убран по требованию — оставляем пустую строку и не рендерим поле
  const [searchQuery, setSearchQuery] = useState('');
  const [showImages, setShowImages] = useState(true);
  const effectiveShowImages = showImagesOverride ?? showImages;
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Объединяем все услуги из групп
  const allServices = useMemo(() => {
    if (!serviceGroups || !Array.isArray(serviceGroups)) {
      return [];
    }
    return serviceGroups.flatMap(group => {
      if (!group.services || !Array.isArray(group.services)) {
        return [];
      }
      return group.services.map(service => ({
        ...service,
        description: service.description || '',
        image: service.photoUrl || service.image
      }));
    });
  }, [serviceGroups]);

  // Табы групп услуг
  const groupTabs = useMemo(() => {
    if (!serviceGroups || !Array.isArray(serviceGroups)) return [] as Array<{ id: string; name: string; count: number }>
    return serviceGroups.map(g => ({ id: String((g as any).id), name: (g as any).name || 'Группа', count: (g as any).services?.length || 0 }))
      .filter(tab => tab.count > 0)
  }, [serviceGroups])

  // Инициализация/сброс выбранной группы при изменении списка групп
  useEffect(() => {
    if (groupTabs.length === 0) {
      setSelectedGroupId(null)
      return
    }
    if (!selectedGroupId || !groupTabs.some(t => t.id === selectedGroupId)) {
      setSelectedGroupId(groupTabs[0].id)
    }
  }, [groupTabs, selectedGroupId])

  // Услуги текущей выбранной группы (или все, если групп 0/1)
  const servicesOfSelectedGroup = useMemo(() => {
    if (groupTabs.length <= 1) return allServices
    const group = serviceGroups.find(g => String((g as any).id) === selectedGroupId)
    const list = (group as any)?.services || []
    return list.map((service: any) => ({
      ...service,
      description: service.description || '',
      image: service.photoUrl || service.image,
    })) as Service[]
  }, [groupTabs, allServices, selectedGroupId, serviceGroups])

  // Фильтрация по поиску
  const filteredServices = useMemo(() => {
    const base = servicesOfSelectedGroup
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    return base.filter((service: Service) =>
      service.name.toLowerCase().includes(q) ||
      (service.description || '').toLowerCase().includes(q)
    )
  }, [servicesOfSelectedGroup, searchQuery])

  // Вычисления для выбранных услуг
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.price, 0),
    [selectedServices]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.duration, 0),
    [selectedServices]
  );

  const toggleService = (service: Service) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    console.log('🔍 toggleService:', { service: service.name, isSelected });
    
    if (isSelected) {
      onServiceSelect(selectedServices.filter(s => s.id !== service.id));
    } else {
      onServiceSelect([...selectedServices, service]);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
  };

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value || 0)
    } catch {
      return `${Math.round(value || 0).toLocaleString('ru-RU')} ₽`
    }
  }

  const getHueFromString = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 360
  }

  const getDisplayImageUrl = (url?: string | null) => {
     if (!url) return null
     try {
       const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
       if (typeof window !== 'undefined') {
         const cur = window.location
         // Приводим localhost/127.0.0.1 к относительному
         if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
          const path = u.pathname.startsWith('/') ? u.pathname : `/${u.pathname}`
          return `${cur.protocol}//${cur.host}${path}`
         }
         // Избегаем mixed-content: если страница https, поднимаем до https для того же хоста
         if (cur.protocol === 'https:' && u.protocol === 'http:' && u.hostname === cur.hostname) {
           u.protocol = 'https:'
           return u.href
         }
         // Если относительный путь или тот же хост — возвращаем абсолютный URL
         if (u.hostname === cur.hostname) {
           return `${cur.protocol}//${cur.host}${u.pathname}`
         }
       }
       return u.href
     } catch {
      if (typeof window !== 'undefined') {
        const cur = window.location
        const path = url.startsWith('/') ? url : `/${url}`
        return `${cur.protocol}//${cur.host}${path}`
      }
      return url
    }
  }

  const ServiceCard = ({ service }: { service: Service }) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    const imageUrl = getDisplayImageUrl(service.image || service.photoUrl);

    const hue = getHueFromString(service.id || service.name || 'service')
    const fallbackGradient = `linear-gradient(135deg, hsl(${hue} 70% 70%), hsl(${(hue + 30) % 360} 70% 55%))`

    return (
      <div
        onClick={() => toggleService(service)}
        className={`group relative cursor-pointer transition-all rounded-lg border overflow-hidden ${
          isSelected
            ? 'ring-2 ring-primary shadow-lg'
            : 'border-gray-200 hover:shadow-lg'
        }`}
      >
        {/* Блок изображения 4:3 с оверлеями */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
          {effectiveShowImages ? (
            imageUrl ? (
              <ImageWithFallback
                src={imageUrl}
                alt={service.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <div className="text-center text-white">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-90" />
                  <div className="text-xs opacity-75 px-2 font-medium">НЕТ ФОТО</div>
                </div>
              </div>
            )
          ) : (
            <div className="w-full h-full bg-white" />
          )}

          {/* Индикатор выбранного в левом верхнем углу, как в макете */}
          {isSelected && (
            <div className="absolute top-3 left-3 z-10">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          )}

          {/* Оверлеи: название, затем чипы времени и цены */}
          <div className="absolute bottom-3 left-3 right-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              <span className="bg-black/80 text-white text-xs font-medium shadow-lg border-0 rounded-full px-[6.5px] py-1">
                {service.name}
              </span>
            </div>
            <div className="flex gap-1">
              <span className="bg-black/80 text-white text-xs font-medium shadow-lg border-0 rounded-full px-[6.5px] py-1 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {service.duration} мин
              </span>
              <span className="bg-black/80 text-white text-xs font-medium shadow-lg border-0 rounded-full px-[6.5px] py-1">
                {formatCurrency(Number(service.price))}
              </span>
            </div>
          </div>
        </div>

        {/* Описание под фото */}
        {service.description && (
          <div className="p-3">
            <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">{service.description}</p>
          </div>
        )}
      </div>
    );
  };

  const ServiceCardNoImage = ({ service }: { service: Service }) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    return (
      <div
        onClick={() => toggleService(service)}
        className={`group relative cursor-pointer transition-all rounded-lg border overflow-hidden ${
          isSelected ? 'ring-2 ring-primary shadow-lg' : 'border-gray-200 hover:shadow-lg'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium mb-2 leading-relaxed truncate text-foreground">{service.name}</h3>
              {service.description && (
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{service.description}</p>
              )}
            </div>
            {isSelected && (
              <div className="ml-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <span className="text-xs font-medium rounded px-2 py-1 inline-flex items-center" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                <Clock className="w-3 h-3 mr-1" /> {service.duration} мин
              </span>
              <span className="text-xs font-medium rounded px-2 py-1" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                {formatCurrency(Number(service.price))}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Поиск удалён */}

      {/* Кнопки групп (если групп > 1). Цвет: #2563eb */}
      {groupTabs.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {groupTabs.map(tab => (
            <Button
              key={tab.id}
              variant={selectedGroupId === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGroupId(tab.id)}
              className={`rounded-full border !border-[#2563eb] ${selectedGroupId === tab.id ? '!bg-[#2563eb] !text-white' : '!bg-white !text-[#2563eb]'}`}
            >
              {tab.name}
            </Button>
          ))}
        </div>
      )}

      {/* Услуги — сетка: максимум 3 карточки в ряд */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
        {filteredServices.map((service) => (
          (effectiveShowImages) ? (
            <ServiceCard key={service.id} service={service} />
          ) : (
            <ServiceCardNoImage key={service.id} service={service} />
          )
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Услуги не найдены</div>
          <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
        </div>
      )}

      {/* Удалён fallback-список по требованию */}

      {/* Итоговая информация и кнопки */}
      {selectedServices.length > 0 && (
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-4 border border-gray-200 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm text-gray-600">
                Выбрано услуг: {selectedServices.length}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  {formatDuration(totalDuration)}
                </span>
                <span className="font-semibold text-[#f59e0b]">
                  {formatCurrency(Number(totalPrice))}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => onServiceSelect([])}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Очистить выбор"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Кнопка "Далее" */}
          {onNext && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  console.log('🔍 EnhancedServiceSelection: onNext clicked');
                  onNext();
                }}
                className="bg-[#f59e0b] hover:bg-[#ea580c] text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>Продолжить</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
