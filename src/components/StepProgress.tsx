import React from 'react';
import { Check } from 'lucide-react';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export const StepProgress: React.FC<StepProgressProps> = ({ 
  currentStep, 
  totalSteps, 
  stepLabels 
}) => {
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full mb-8">
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-700 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
        
        {/* Step Indicators */}
        <div className="relative flex justify-between">
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            
            return (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className={`step-indicator ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  style={{ '--progress': `${isCompleted ? 100 : isActive ? 50 : 0}%` } as React.CSSProperties}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                <span className={`text-xs mt-2 font-medium transition-colors duration-300 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-accent' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Circular Progress Alternative for Mobile */}
      <div className="md:hidden flex justify-center">
        <div 
          className="progress-circle"
          style={{ '--progress': `${progressPercentage}%` } as React.CSSProperties}
        >
          <div className="progress-content">
            {currentStep}/{totalSteps}
          </div>
        </div>
      </div>
    </div>
  );
};