// Определяем enums локально, так как Prisma Client не экспортирует их

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN', 
  MASTER: 'MASTER'
} as const

export const TeamStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
} as const

export const BookingStatus = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED_BY_CLIENT: 'CANCELLED_BY_CLIENT',
  CANCELLED_BY_SALON: 'CANCELLED_BY_SALON',
  NO_SHOW: 'NO_SHOW'
} as const

export const ActionType = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
  CANCELLED_BY_CLIENT: 'CANCELLED_BY_CLIENT',
  CANCELLED_BY_SALON: 'CANCELLED_BY_SALON',
  UPDATED: 'UPDATED'
} as const

export const ClientSource = {
  TELEGRAM_WEBAPP: 'TELEGRAM_WEBAPP',
  PUBLIC_PAGE: 'PUBLIC_PAGE',
  ADMIN_CREATED: 'ADMIN_CREATED'
} as const

export const ClientActionType = {
  PAGE_VIEW: 'PAGE_VIEW',
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED'
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]
export type TeamStatus = typeof TeamStatus[keyof typeof TeamStatus]
export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus]
export type ActionType = typeof ActionType[keyof typeof ActionType]
export type ClientSource = typeof ClientSource[keyof typeof ClientSource]
export type ClientActionType = typeof ClientActionType[keyof typeof ClientActionType]
