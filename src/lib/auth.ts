import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  teamId: string
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' })
}

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
}

export const generateTeamNumber = (): string => {
  // Генерирует номер формата B0XXXXXXX где X - случайные цифры
  const randomNumber = Math.floor(Math.random() * 9999999).toString().padStart(7, '0')
  return `B0${randomNumber}`
}

export const generateBookingNumber = (): string => {
  // Генерирует уникальный номер бронирования
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `BK${timestamp}${random}`.toUpperCase()
}