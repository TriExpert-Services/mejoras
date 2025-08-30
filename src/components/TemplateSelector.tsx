import React from 'react';
import { templates, Template } from '../template-config';
import { Badge } from './ui/badge';

interface TemplateSelectorProps {
  allowedTemplateIds: number[];
  selectedTemplateId: number;
  onTemplateChange: (templateId: number) => void;
  className?: string;
}

export function TemplateSelector({ 
  allowedTemplateIds, 
  selectedTemplateId, 
  onTemplateChange,
  className = ""
}: TemplateSelectorProps) {
  const allowedTemplates = templates.filter(template => 
    allowedTemplateIds.includes(template.id)
  );

  const getOSColorClass = (os: string) => {
    switch (os) {
      case 'ubuntu': return 'border-orange-200 bg-orange-50 hover:bg-orange-100';
      case 'debian': return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'almalinux': return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'rocky': return 'border-green-200 bg-green-50 hover:bg-green-100';
      default: return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getOSBadgeClass = (os: string) => {
    switch (os) {
      case 'ubuntu': return 'bg-orange-100 text-orange-800';
      case 'debian': return 'bg-red-100 text-red-800';
      case 'almalinux': return 'bg-blue-100 text-blue-800';
      case 'rocky': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Seleccionar Sistema Operativo</h4>
        <p className="text-sm text-gray-600 mb-4">
          Elige la plantilla del sistema operativo para tu VPS
        </p>
      </div>
      
      <div className="grid gap-3">
        {allowedTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
              ${selectedTemplateId === template.id 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : getOSColorClass(template.os)
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <h5 className="font-medium text-gray-900">{template.name}</h5>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge className={getOSBadgeClass(template.os)}>
                  {template.os.charAt(0).toUpperCase() + template.os.slice(1)}
                </Badge>
                {selectedTemplateId === template.id && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          <span className="font-medium">Recomendación:</span> Ubuntu 24.04 LTS para la mayoría de aplicaciones web y desarrollo.
        </p>
      </div>
    </div>
  );
}