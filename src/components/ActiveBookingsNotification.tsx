import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ActiveBookingsNotificationProps {
  activeBookings: any[];
  isLoading: boolean;
}

export default function ActiveBookingsNotification({
  activeBookings,
  isLoading
}: ActiveBookingsNotificationProps) {
  if (isLoading || activeBookings.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <div>
            <h3 className="font-medium text-orange-900">
              У вас есть активные записи
            </h3>
            <p className="text-sm text-orange-700">
              Найдено {activeBookings.length} активных записей
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}