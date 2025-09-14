import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  className, 
  fallback 
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={cn("bg-muted flex items-center justify-center", className)}>
        {fallback || (
          <div className="text-muted-foreground text-sm">Нет изображения</div>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}