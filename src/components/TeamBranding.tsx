import React from 'react';
import { TeamData } from '@/types/booking';
import { ImageWithFallback } from './ImageWithFallback';
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
        <div className="flex justify-center mb-2">
          <div className="relative bg-white rounded-2xl shadow-lg border border-border overflow-hidden p-6 w-32 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
            <ImageWithFallback
              src={team.publicPageLogoUrl}
              alt={`Логотип ${team.name}`}
              className="max-h-8 w-auto object-contain relative z-10 filter drop-shadow-sm"
            />
          </div>
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
      </div>
    </div>
  );
}