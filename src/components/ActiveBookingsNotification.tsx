import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, X, Calendar, Clock } from 'lucide-react';

interface ActiveBookingsNotificationProps {
  activeBookings: any[];
  isLoading: boolean;
  onCancelBooking?: (bookingId: string) => void;
}

export default function ActiveBookingsNotification({
  activeBookings,
  isLoading,
  onCancelBooking
}: ActiveBookingsNotificationProps) {
  if (isLoading || activeBookings.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-orange-900 mb-3">
              У вас есть активные записи ({activeBookings.length})
            </h3>
            <div className="space-y-3">
              {activeBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm mb-1">
                        {booking.serviceName || 'Услуга'}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {booking.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {booking.time}
                        </span>
                      </div>
                    </div>
                    {onCancelBooking && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancelBooking(booking.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}