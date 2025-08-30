import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { 
  HelpCircle, 
  MessageCircle, 
  FileText, 
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Book,
  Zap
} from 'lucide-react';

export function UserSupport() {
  const supportChannels = [
    {
      title: 'Chat en Vivo',
      description: 'Soporte inmediato para problemas urgentes',
      icon: MessageCircle,
      action: 'Iniciar Chat',
      available: true,
      hours: '24/7'
    },
    {
      title: 'Email de Soporte',
      description: 'Para consultas detalladas y no urgentes',
      icon: Mail,
      action: 'Enviar Email',
      available: true,
      hours: 'Respuesta en 2-4 horas'
    },
    {
      title: 'Soporte Telefónico',
      description: 'Asistencia directa por teléfono',
      icon: Phone,
      action: 'Llamar Ahora',
      available: false,
      hours: 'Próximamente'
    }
  ];

  const quickHelp = [
    {
      title: 'Guía de Inicio Rápido',
      description: 'Aprende a configurar tu primer VPS',
      icon: Zap,
      link: '#quick-start'
    },
    {
      title: 'Documentación API',
      description: 'Integra tu VPS con aplicaciones',
      icon: Book,
      link: '#api-docs'
    },
    {
      title: 'FAQ Frecuentes',
      description: 'Respuestas a preguntas comunes',
      icon: HelpCircle,
      link: '#faq'
    },
    {
      title: 'Estado del Servicio',
      description: 'Verifica el estado de nuestros servidores',
      icon: Globe,
      link: '#status'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Centro de Soporte</h1>
        <p className="text-gray-600">Obtén ayuda y recursos para maximizar tu experiencia</p>
      </div>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
            Contactar Soporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {supportChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.title} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center mb-3">
                    <Icon className="h-6 w-6 text-blue-600 mr-2" />
                    <h3 className="font-medium">{channel.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{channel.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{channel.hours}</span>
                    <Button 
                      size="sm" 
                      disabled={!channel.available}
                      className={channel.available ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      {channel.action}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Book className="h-5 w-5 mr-2 text-green-600" />
            Recursos de Ayuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {quickHelp.map((resource) => {
              const Icon = resource.icon;
              return (
                <button
                  key={resource.title}
                  className="text-left border rounded-lg p-4 hover:bg-gray-50 transition-colors group"
                  onClick={() => alert('Recurso en desarrollo')}
                >
                  <div className="flex items-center mb-2">
                    <Icon className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="font-medium group-hover:text-blue-600">{resource.title}</h3>
                    <ExternalLink className="h-3 w-3 text-gray-400 ml-auto" />
                  </div>
                  <p className="text-sm text-gray-600">{resource.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2 text-purple-600" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-green-900">Servidores VPS</p>
                  <p className="text-sm text-green-700">Funcionando normalmente</p>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">99.9% Uptime</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-green-900">API de Gestión</p>
                  <p className="text-sm text-green-700">Respuesta rápida</p>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">Operativo</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-green-900">Procesamiento de Pagos</p>
                  <p className="text-sm text-green-700">Stripe conectado</p>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">Activo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-red-600" />
            Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Nueva Contraseña</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmar Contraseña</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}