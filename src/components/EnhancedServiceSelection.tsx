'use client'

import React, { useState, useMemo } from 'react'
import { Search, Clock, DollarSign, Grid, List, Check, X, Star, Info, XCircle } from 'lucide-react'
import { Service, ServiceGroup } from '@/types/booking'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface EnhancedServiceSelectionProps {
  serviceGroups: ServiceGroup[];
  selectedServices: Service[];
  onServiceSelect: (services: Service[]) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type PriceFilter = 'all' | 'budget' | 'standard' | 'premium';

export function EnhancedServiceSelection({
  serviceGroups,
  selectedServices,
  onServiceSelect,
  className = ''
}: EnhancedServiceSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

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

  // Фильтрация услуг
  const filteredServices = useMemo(() => {
    let filtered = allServices;

    // Поиск по названию и описанию
    if (searchQuery) {
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фильтр по цене
    if (priceFilter !== 'all') {
      filtered = filtered.filter(service => {
        if (priceFilter === 'budget') return service.price <= 1000;
        if (priceFilter === 'standard') return service.price > 1000 && service.price <= 3000;
        if (priceFilter === 'premium') return service.price > 3000;
        return true;
      });
    }

    return filtered;
  }, [allServices, searchQuery, priceFilter]);

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

  const ServiceCard = ({ service }: { service: Service }) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    const imageUrl = service.image || service.photoUrl;

    return (
      <div
        onClick={() => toggleService(service)}
        className={`
          relative cursor-pointer transition-all duration-300 rounded-2xl p-4 border
          hover:scale-[1.02] hover:shadow-lg
          ${isSelected 
            ? 'border-[#00acf4] bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg scale-[1.02]' 
            : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:border-gray-300'
          }
        `}
      >
        {/* Checkmark для выбранных услуг */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#00acf4] text-white rounded-full flex items-center justify-center shadow-lg z-10">
            <Check className="w-4 h-4" />
          </div>
        )}

        {/* Изображение услуги */}
        {imageUrl && (
          <div className="w-16 h-16 rounded-xl overflow-hidden mb-3 mx-auto">
            <img
              src={imageUrl}
              alt={service.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Информация об услуге */}
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {service.name}
          </h3>
          
          {service.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {service.description}
            </p>
          )}

          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(service.duration)}</span>
            </div>
            
            <div className="flex items-center gap-1 font-semibold text-[#00acf4]">
              <DollarSign className="w-4 h-4" />
              <span>{service.price.toLocaleString()}</span>
            </div>
          </div>

          {service.requireConfirmation && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              Требует подтверждения
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Поиск и фильтры */}
      <div className="space-y-4">
        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск услуг..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00acf4] focus:border-transparent transition-all"
          />
        </div>

        {/* Фильтры и переключатель вида */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPriceFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                priceFilter === 'all' 
                  ? 'bg-[#00acf4] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setPriceFilter('budget')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                priceFilter === 'budget' 
                  ? 'bg-[#00acf4] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              до 1000₽
            </button>
            <button
              onClick={() => setPriceFilter('standard')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                priceFilter === 'standard' 
                  ? 'bg-[#00acf4] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              1000-3000₽
            </button>
            <button
              onClick={() => setPriceFilter('premium')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                priceFilter === 'premium' 
                  ? 'bg-[#00acf4] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              от 3000₽
            </button>
          </div>

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-[#00acf4] text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' 
                  ? 'bg-[#00acf4] text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Услуги */}
      <div className={`
        grid gap-4 
        ${viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
        }
      `}>
        {filteredServices.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Услуги не найдены</div>
          <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
        </div>
      )}

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
                <span className="flex items-center gap-1 font-semibold text-[#00acf4]">
                  <DollarSign className="w-4 h-4" />
                  {totalPrice.toLocaleString()}
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
        </div>
      )}
    </div>
  );
}
