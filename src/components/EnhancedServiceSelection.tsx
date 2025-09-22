import React, { useState, useMemo } from 'react'
import { Clock, ArrowRight, Sparkles, Scissors, Star, Zap } from 'lucide-react'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { Service, ServiceGroup } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface EnhancedServiceSelectionProps {
  serviceGroups: ServiceGroup[];
  ungroupedServices: Service[];
  selectedServices: Service[];
  onServiceSelect: (services: Service[]) => void;
  onNext?: () => void;
  className?: string;
  showImagesOverride?: boolean;
}

// Иконки для категорий услуг
const getCategoryIcon = (groupName: string) => {
  if (groupName.toLowerCase().includes('маникюр') || groupName.toLowerCase().includes('ногти')) {
    return <Star className="w-4 h-4 text-primary" />
  }
  if (groupName.toLowerCase().includes('стрижка') || groupName.toLowerCase().includes('волос')) {
    return <Scissors className="w-4 h-4 text-primary" />
  }
  if (groupName.toLowerCase().includes('комплекс') || groupName.toLowerCase().includes('спа')) {
    return <Zap className="w-4 h-4 text-primary" />
  }
  return <Sparkles className="w-4 h-4 text-primary" />
}

export function EnhancedServiceSelection({
  serviceGroups,
  ungroupedServices,
  selectedServices,
  onServiceSelect,
  onNext,
  className,
  showImagesOverride = true
}: EnhancedServiceSelectionProps) {
  const showImages = showImagesOverride
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0),
    [selectedServices]
  )

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, service) => sum + (service.duration || 0), 0),
    [selectedServices]
  )

  const handleServiceToggle = (service: Service) => {
    const isSelected = selectedServices.some(s => s.id === service.id)
    
    if (isSelected) {
      onServiceSelect(selectedServices.filter(s => s.id !== service.id))
    } else {
      onServiceSelect([...selectedServices, service])
    }
  }

  const handleNext = () => {
    if (selectedServices.length > 0 && onNext) {
      onNext()
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Категории услуг - закладки */}
      {serviceGroups.length > 1 && (
        <div className="space-y-2">
          {/* Мобильная версия - сетка */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                activeCategory === null 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Все услуги
            </button>
            {serviceGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveCategory(group.id)}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  activeCategory === group.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {getCategoryIcon(group.name)}
                {group.name}
              </button>
            ))}
          </div>
          
          {/* Десктопная версия - горизонтальная прокрутка */}
          <div className="hidden md:flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                activeCategory === null 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Все услуги
            </button>
            {serviceGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveCategory(group.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  activeCategory === group.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {getCategoryIcon(group.name)}
                {group.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modern Header */}
      <div className="modern-card rounded-2xl p-4">
        <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
          {activeCategory 
            ? serviceGroups.find(g => g.id === activeCategory)?.name || 'Выберите услуги'
            : 'Выберите услуги'
          }
        </h2>
      </div>

      {/* Responsive Service Groups */}
      {serviceGroups
        .filter(group => activeCategory === null || group.id === activeCategory)
        .map((group, groupIndex) => (
        <div key={group.id} className="animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
          <Card className="modern-card rounded-2xl overflow-hidden border-0">
            {/* Показываем заголовок только если не выбрана конкретная категория */}
            {activeCategory === null && (
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {getCategoryIcon(group.name)}
                  {group.name}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent className={cn("p-0", activeCategory === null ? "" : "pt-4")}>
              {/* Desktop Grid Layout */}
              <div className="hidden md:block">
                <div className="service-grid-desktop p-4">
                  {group.services.map((service, serviceIndex) => {
                    const isSelected = selectedServices.some(s => s.id === service.id)
                    
                    return (
                      <Card 
                        key={service.id}
                        className={`service-card ${
                          isSelected ? 'selected ring-2 ring-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleServiceToggle(service)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <Checkbox checked={isSelected} className="rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {showImages && (service.image || service.photoUrl) && (
                                <div className="mb-2">
                                  <img
                                    src={service.image || service.photoUrl}
                                    alt={service.name}
                                    className="w-full h-28 object-cover rounded-lg shadow-sm"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <h3 className="font-semibold text-foreground mb-1 text-sm">{service.name}</h3>
                              {service.description && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {service.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {service.duration} мин
                                </span>
                                <span className="font-bold text-primary bg-primary-soft px-2 py-1 rounded-full text-xs">
                                  {new Intl.NumberFormat('ru-RU').format(service.price)} ₽
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Mobile Stack Layout */}
              <div className="md:hidden">
                <div className="service-stack-mobile p-4">
                  {group.services.map((service, serviceIndex) => {
                    const isSelected = selectedServices.some(s => s.id === service.id)
                    
                    return (
                      <Card
                        key={service.id}
                        className={cn(
                          "cursor-pointer transition-all duration-300 rounded-xl border-0 touch-target animate-slide-up",
                          isSelected 
                            ? "ring-2 ring-primary bg-primary-soft shadow-lg shadow-primary/10 scale-[1.02]" 
                            : "hover:shadow-md hover:scale-[1.01] hover:border-primary/20 bg-gradient-card"
                        )}
                        style={{ animationDelay: `${(groupIndex * 100) + (serviceIndex * 50)}ms` }}
                        onClick={() => handleServiceToggle(service)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <Checkbox checked={isSelected} className="rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {showImages && (service.image || service.photoUrl) && (
                                <div className="mb-3">
                                  <img
                                    src={service.image || service.photoUrl}
                                    alt={service.name}
                                    className="w-full h-24 object-cover rounded-xl shadow-sm"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <h3 className="font-semibold text-foreground mb-1 text-sm">{service.name}</h3>
                              {service.description && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {service.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {service.duration} мин
                                </span>
                                <span className="font-bold text-primary bg-primary-soft px-2 py-1 rounded-full">
                                  {new Intl.NumberFormat('ru-RU').format(service.price)} ₽
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Mobile Summary Card (Hidden on Desktop) */}
      {selectedServices.length > 0 && (
        <div className="animate-scale-in md:hidden">
          <Card className="bg-gradient-primary text-primary-foreground rounded-2xl border-0 shadow-xl shadow-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm">Выбрано: {selectedServices.length}</h3>
                  <p className="text-xs opacity-90">
                    ⏱️ {totalDuration} мин
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold mb-2">
                    {new Intl.NumberFormat('ru-RU').format(totalPrice)} ₽
                  </p>
                  <Button
                    onClick={handleNext}
                    className="bg-white/20 text-primary-foreground hover:bg-white/30 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm border border-white/20 touch-target"
                  >
                    Продолжить
                    <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}