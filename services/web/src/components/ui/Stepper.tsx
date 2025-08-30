import React from 'react';

interface Step {
  id: number;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepperProps {
  currentStep: number;
  steps: Step[];
  variant?: 'default' | 'compact' | 'vertical';
  showDescription?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  steps,
  variant = 'default',
  showDescription = true
}) => {
  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepIcon = (step: Step, status: string, index: number) => {
    if (status === 'completed') {
      return (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    if (step.icon) {
      return <div className="w-5 h-5 flex items-center justify-center text-current">{step.icon}</div>;
    }
    
    return <span className="text-sm font-bold">{index + 1}</span>;
  };

  const stepStatusClasses = {
    completed: 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 shadow-lg scale-100',
    current: 'bg-gradient-to-r from-orange-500 to-purple-600 text-white border-orange-500 shadow-xl ring-4 ring-orange-500/20 scale-110',
    upcoming: 'bg-white text-gray-500 border-gray-300 shadow-sm'
  };

  const lineStatusClasses = {
    completed: 'bg-gradient-to-r from-green-500 to-green-600',
    current: 'bg-gradient-to-r from-orange-500 to-purple-600',
    upcoming: 'bg-gray-200'
  };

  const textStatusClasses = {
    completed: 'text-green-600',
    current: 'text-orange-600 font-semibold',
    upcoming: 'text-gray-400'
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <React.Fragment key={step.id || index}>
              <div className="flex flex-col items-center space-y-3 relative">
                {/* Step Circle */}
                <div className={`
                  w-12 h-12 rounded-full border-2 flex items-center justify-center 
                  transition-all duration-300 transform relative z-10
                  ${stepStatusClasses[status]}
                `}>
                  {getStepIcon(step, status, index)}
                  
                  {/* Pulse animation for current step */}
                  {status === 'current' && (
                    <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20"></div>
                  )}
                </div>
                
                {/* Step Title */}
                <div className="text-center max-w-20">
                  <h3 className={`text-sm font-medium transition-colors duration-300 ${textStatusClasses[status]}`}>
                    {step.title}
                  </h3>
                  {showDescription && step.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-tight">{step.description}</p>
                  )}
                </div>
              </div>
              
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 px-4 relative">
                  <div className={`h-1 w-full rounded-full transition-all duration-500 ${
                    status === 'completed' ? lineStatusClasses.completed : lineStatusClasses.upcoming
                  }`}>
                    {/* Animated progress line */}
                    {status === 'completed' && (
                      <div className="h-full w-full bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
