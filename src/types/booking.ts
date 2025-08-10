// Типы данных для системы записи

export interface Service {
  id: string;
  name: string;
  duration: number; // в минутах
  price: number; // в рублях
  description: string;
  image?: string; // URL изображения
  photoUrl?: string; // Альтернативное поле для совместимости
  requireConfirmation?: boolean;
}

export interface ServiceGroup {
  id: string;
  name: string;
  order: number;
  services: Service[];
}

export interface Master {
  id: string;
  firstName: string;
  lastName: string;
  name?: string; // Вычисляемое поле
  specialization?: string;
  photoUrl?: string;
  description?: string;
  services?: string[]; // ID услуг
}

export interface TimeSlot {
  time: string; // формат "HH:MM"
  available: boolean;
  timezoneInfo?: {
    salonTime: string;
    clientTime: string;
    timezoneInfo: string;
  };
}

export interface ClientInfo {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface BookingData {
  services: Service[];
  date: string;
  master: Master | null;
  timeSlot: TimeSlot | null;
  clientInfo: ClientInfo;
  totalPrice: number;
  totalDuration: number;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  privacyPolicyUrl?: string;
  slug: string;
}

export type BookingStep = 'select-services' | 'select-date-time' | 'client-info';

export const stepNames: Record<BookingStep, string> = {
  'select-services': 'Выбор услуг',
  'select-date-time': 'Дата и время',
  'client-info': 'Контактные данные'
};
