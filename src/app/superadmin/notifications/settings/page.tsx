'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Info } from 'lucide-react'
import Link from 'next/link'

interface NotificationSettings {
  id: string
  teamId: string
  enabled: boolean
}

interface Team {
  id: string
  name: string
  teamNumber: string
}

export default function NotificationSettingsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Загружаем список команд
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch('/api/superadmin/teams')
        if (response.ok) {
          const data = await response.json()
          setTeams(data.teams || [])
        }
      } catch (error) {
        console.error('Error loading teams:', error)
        setMessage({ type: 'error', text: 'Ошибка загрузки списка команд' })
      }
    }

    loadTeams()
  }, [])

  // Загружаем настройки выбранной команды
  useEffect(() => {
    if (!selectedTeamId) {
      setSettings(null)
      return
    }

    const loadSettings = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/superadmin/notifications/settings/${selectedTeamId}`)
        if (response.ok) {
          const data = await response.json()
          setSettings(data.settings)
        } else {
          setMessage({ type: 'error', text: 'Ошибка загрузки настроек команды' })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        setMessage({ type: 'error', text: 'Ошибка загрузки настроек' })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [selectedTeamId])

  // Сохранение настроек
  const handleSave = async () => {
    if (!settings || !selectedTeamId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/superadmin/notifications/settings/${selectedTeamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: settings.enabled })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки сохранены успешно' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Ошибка сохранения' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек' })
    } finally {
      setSaving(false)
    }
  }

  // Обновление значения
  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  const selectedTeam = teams.find(team => team.id === selectedTeamId)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Настройки уведомлений команд</h1>
        <p className="text-gray-600 mt-2">
          Управление отправкой уведомлений для конкретных команд
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Выбор команды */}
        <Card>
          <CardHeader>
            <CardTitle>Выбор команды</CardTitle>
            <CardDescription>
              Выберите команду для настройки уведомлений
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-select">Команда</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger id="team-select">
                    <SelectValue placeholder="Выберите команду" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.teamNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Настройки команды */}
        {selectedTeamId && (
          <Card>
            <CardHeader>
              <CardTitle>Настройки команды: {selectedTeam?.name}</CardTitle>
              <CardDescription>
                Управление отправкой уведомлений для этой команды
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Глобальные настройки системы</strong><br/>
                  Настройки Rate Limiting, Retry Logic и Circuit Breaker находятся в 
                  <Link href="/superadmin/global-notification-settings" className="text-blue-600 hover:underline ml-1">
                    глобальных настройках системы
                  </Link>.
                  Здесь вы можете только включить/отключить отправку уведомлений для конкретной команды.
                </AlertDescription>
              </Alert>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : settings ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enabled"
                      checked={settings.enabled}
                      onCheckedChange={(checked) => updateSetting('enabled', checked)}
                    />
                    <Label htmlFor="enabled">Включить отправку уведомлений</Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    При отключении команда не будет получать уведомления о записях, отменах и напоминаниях
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Ошибка загрузки настроек команды
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Кнопки действий */}
        {selectedTeamId && settings && (
          <div className="flex space-x-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить настройки
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}