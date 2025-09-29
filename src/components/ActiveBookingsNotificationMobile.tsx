import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, X, Calendar, Clock, User } from 'lucide-react';

interface Booking {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  masterName: string;
  status: 'confirmed' | 'pending';
}

interface ActiveBookingsNotificationMobileProps {
  activeBookings: Booking[];
  isLoading: boolean;
  onCancelBooking: (bookingId: string) => void;
}

export default function ActiveBookingsNotificationMobile({
  activeBookings,
  isLoading,
  onCancelBooking
}: ActiveBookingsNotificationMobileProps) {
  if (isLoading || activeBookings.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5 rounded-md border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-medium text-foreground">
              Активные записи
            </h3>
            <p className="text-sm text-muted-foreground">
              У вас {activeBookings.length} {activeBookings.length === 1 ? 'запись' : 'записи'}
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          {activeBookings.map((booking) => (
            <Card key={booking.id} className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm text-foreground">{booking.serviceName}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(booking.date).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{booking.time}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{booking.masterName}</span>
                    </div>
                    
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {booking.status === 'confirmed' ? 'Подтверждена' : 'Ожидает подтверждения'}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelBooking(booking.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}