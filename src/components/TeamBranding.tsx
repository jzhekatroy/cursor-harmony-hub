import React from 'react';
import { TeamData } from '@/types/booking';
import { ImageWithFallback } from './ImageWithFallback';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamBrandingProps {
  team: TeamData['team'];
  className?: string;
  showDescription?: boolean;
}

export function TeamBranding({ team, className, showDescription = true }: TeamBrandingProps) {
  return (
    <div className={cn("flex flex-col items-center text-center space-y-4 mb-8", className)}>
      {team.publicPageLogoUrl && (
        <div className="flex justify-center mb-4">
          <ImageWithFallback
            src={team.publicPageLogoUrl}
            alt={`Логотип ${team.name}`}
            className="h-16 w-auto object-contain filter drop-shadow-md"
          />
        </div>
      )}
      
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
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{team.publicPageAddress}</span>
          </div>
        )}
      </div>
    </div>
  );
}