import React from 'react';

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 flex items-center">
            <div className="flex items-center flex-col">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep 
                    ? 'bg-gradient-primary text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {index < currentStep ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <p className={`mt-2 text-xs font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-500'}`}>
                {step}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-4 ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
