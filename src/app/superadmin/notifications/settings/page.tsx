'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'

interface NotificationSettings {
  id: string
  teamId: string
  maxRequestsPerMinute: number
  requestDelayMs: number
  maxRetryAttempts: number
  retryDelayMs: number
  exponentialBackoff: boolean
  failureThreshold: number
  recoveryTimeoutMs: number
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
      }
    }
    loadTeams()
  }, [])

  // Загружаем настройки выбранной команды
  useEffect(() => {
    if (selectedTeamId) {
      loadSettings(selectedTeamId)
    }
  }, [selectedTeamId])

  const loadSettings = async (teamId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/superadmin/notifications/settings/${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        setMessage({ type: 'error', text: 'Ошибка загрузки настроек' })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!selectedTeamId || !settings) return

    setSaving(true)
    try {
      const response = await fetch(`/api/superadmin/notifications/settings/${selectedTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки сохранены успешно' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Ошибка сохранения' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Ошибка сохранения' })
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    if (!selectedTeamId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/superadmin/notifications/settings/${selectedTeamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setMessage({ type: 'success', text: 'Настройки сброшены к дефолтным' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Ошибка сброса' })
      }
    } catch (error) {
      console.error('Error resetting settings:', error)
      setMessage({ type: 'error', text: 'Ошибка сброса' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  const selectedTeam = teams.find(team => team.id === selectedTeamId)

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Настройки отправки уведомлений
        </h1>
        <p className="text-gray-600">
          Управление параметрами отправки сообщений для команд
        </p>
      </div>

      {/* Выбор команды */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <Label htmlFor="team-select">Выберите команду</Label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger>
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
      </Card>

      {selectedTeamId && (
        <>
          {loading ? (
            <Card className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Загрузка настроек...</span>
              </div>
            </Card>
          ) : settings ? (
            <div className="space-y-6">
              {/* Общие настройки */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Общие настройки</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enabled">Включить отправку сообщений</Label>
                      <p className="text-sm text-gray-500">
                        Включить или отключить отправку уведомлений для команды
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={settings.enabled}
                      onCheckedChange={(checked) => updateSetting('enabled', checked)}
                    />
                  </div>
                </div>
              </Card>

              {/* Rate Limiting */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Rate Limiting</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxRequestsPerMinute">
                      Максимум запросов в минуту
                    </Label>
                    <Input
                      id="maxRequestsPerMinute"
                      type="number"
                      min="1"
                      max="30"
                      value={settings.maxRequestsPerMinute}
                      onChange={(e) => updateSetting('maxRequestsPerMinute', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Рекомендуется: 25 (лимит Telegram API: 30)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="requestDelayMs">
                      Задержка между запросами (мс)
                    </Label>
                    <Input
                      id="requestDelayMs"
                      type="number"
                      min="100"
                      max="10000"
                      value={settings.requestDelayMs}
                      onChange={(e) => updateSetting('requestDelayMs', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Рекомендуется: 2000 (2 секунды)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Retry Logic */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Retry Logic</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxRetryAttempts">
                      Максимум попыток
                    </Label>
                    <Input
                      id="maxRetryAttempts"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.maxRetryAttempts}
                      onChange={(e) => updateSetting('maxRetryAttempts', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Рекомендуется: 3
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="retryDelayMs">
                      Задержка между попытками (мс)
                    </Label>
                    <Input
                      id="retryDelayMs"
                      type="number"
                      min="1000"
                      max="30000"
                      value={settings.retryDelayMs}
                      onChange={(e) => updateSetting('retryDelayMs', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Рекомендуется: 5000 (5 секунд)
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="exponentialBackoff">Экспоненциальная задержка</Label>
                      <p className="text-sm text-gray-500">
                        Увеличивать задержку с каждой попыткой (5с → 10с → 20с)
                      </p>
                    </div>
                    <Switch
                      id="exponentialBackoff"
                      checked={settings.exponentialBackoff}
                      onCheckedChange={(checked) => updateSetting('exponentialBackoff', checked)}
                    />
                  </div>
                </div>
              </Card>

              {/* Circuit Breaker */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Circuit Breaker</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="failureThreshold">
                      Порог ошибок для блокировки
                    </Label>
                    <Input
                      id="failureThreshold"
                      type="number"
                      min="1"
                      max="20"
                      value={settings.failureThreshold}
                      onChange={(e) => updateSetting('failureThreshold', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      После скольких ошибок подряд заблокировать отправку
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="recoveryTimeoutMs">
                      Время восстановления (мс)
                    </Label>
                    <Input
                      id="recoveryTimeoutMs"
                      type="number"
                      min="10000"
                      max="300000"
                      value={settings.recoveryTimeoutMs}
                      onChange={(e) => updateSetting('recoveryTimeoutMs', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Через сколько времени попробовать снова (рекомендуется: 60000)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Кнопки действий */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Действия</h3>
                    <p className="text-sm text-gray-500">
                      Сохранить изменения или сбросить к дефолтным
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      onClick={resetSettings}
                      disabled={saving}
                      variant="outline"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-2" />
                      )}
                      Сбросить
                    </Button>
                    <Button
                      onClick={saveSettings}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Сохранить
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ошибка загрузки</h3>
                <p className="text-gray-600">Не удалось загрузить настройки для выбранной команды</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Сообщения */}
      {message && (
        <Alert className={`mt-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
