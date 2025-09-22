import React from 'react';
import { TeamData } from '@/types/booking';
import { ImageWithFallback } from './ImageWithFallback';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/2m-logo-mini.png';

interface TeamBrandingProps {
  team: TeamData['team'];
  className?: string;
  showDescription?: boolean;
}

// Функция для генерации ссылки на карты
const getMapLink = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  
  // Определяем тип устройства и регион
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isRussia = address.toLowerCase().includes('москва') || 
                   address.toLowerCase().includes('спб') || 
                   address.toLowerCase().includes('россия');

  if (isIOS) {
    // На iOS сначала пробуем открыть в Maps, если не получится - в браузере
    return `maps://?q=${encodedAddress}`;
  } else if (isAndroid && isRussia) {
    // На Android в России предпочитаем Яндекс.Карты
    return `yandexmaps://maps.yandex.ru/?text=${encodedAddress}`;
  } else if (isRussia) {
    // В браузере в России - Яндекс.Карты
    return `https://yandex.ru/maps/?text=${encodedAddress}`;
  } else {
    // Везде остальное - Google Maps
    return `https://maps.google.com/?q=${encodedAddress}`;
  }
};

export function TeamBranding({ team, className, showDescription = true }: TeamBrandingProps) {
  return (
    <div className={cn("flex flex-col items-center text-center space-y-4 mb-8", className)}>
      <div className="flex justify-center mb-4">
        <img
          src={logoImage}
          alt="2Minutes Logo"
          className="h-8 w-auto object-contain filter drop-shadow-md"
        />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          {team.publicPageTitle || team.name}
        </h1>
        
        {showDescription && team.publicPageDescription && (
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {team.publicPageDescription}
          </p>
        )}
        
        {team.publicPageAddress && (
          <a 
            href={getMapLink(team.publicPageAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:underline"
          >
            <MapPin className="w-4 h-4" />
            <span>{team.publicPageAddress}</span>
          </a>
        )}
      </div>
    </div>
  );
}