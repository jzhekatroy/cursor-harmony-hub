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
        <div className="flex justify-center p-4 bg-white rounded-2xl shadow-sm border border-border">
          <ImageWithFallback
            src={team.publicPageLogoUrl}
            alt={`Логотип ${team.name}`}
            className="h-12 w-auto object-contain filter drop-shadow-sm"
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
      </div>
    </div>
  );
}