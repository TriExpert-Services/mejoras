import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { 
  FileText, 
  Plus, 
  Edit, 
  Save, 
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  Upload,
  Scale,
  Shield,
  Book
} from 'lucide-react';

interface LegalDocument {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  setting_type: string;
  created_at: string;
  updated_at: string;
}

const legalTemplates = [
  {
    key: 'terms_of_service',
    name: 'Términos de Servicio',
    icon: Scale,
    description: 'Condiciones generales de uso de la plataforma',
    template: `# TÉRMINOS DE SERVICIO - VPS PROXMOX

## 1. ACEPTACIÓN DE TÉRMINOS
Al utilizar nuestros servicios de VPS, usted acepta estos términos en su totalidad.

## 2. DESCRIPCIÓN DEL SERVICIO
Ofrecemos servicios de Servidores Privados Virtuales (VPS) basados en tecnología Proxmox con:
- Acceso root completo
- Recursos garantizados (CPU, RAM, almacenamiento)
- Conectividad de red de alta velocidad
- Soporte técnico 24/7

## 3. RESPONSABILIDADES DEL CLIENTE
- Uso responsable de los recursos asignados
- Cumplimiento de las leyes aplicables
- Seguridad de sus datos y aplicaciones
- Pago puntual de las facturas

## 4. LIMITACIONES DE USO
Prohibido:
- Actividades ilegales o spam
- Ataques DDoS o hacking
- Minería de criptomonedas (consultar planes específicos)
- Distribución de malware

## 5. DISPONIBILIDAD DEL SERVICIO
- Garantizamos 99.9% de uptime
- Mantenimientos programados notificados con 24h de anticipación
- SLA disponible para planes empresariales

## 6. POLÍTICA DE REEMBOLSOS
- Reembolso completo dentro de las primeras 72 horas
- Reembolsos prorrateados por cancelación anticipada
- No se reembolsan servicios adicionales o migraciones

## 7. SOPORTE TÉCNICO
- Soporte 24/7 para problemas de infraestructura
- Soporte de aplicaciones según el plan contratado
- Documentación y guías disponibles

## 8. MODIFICACIONES
Nos reservamos el derecho de modificar estos términos con notificación previa de 30 días.

## 9. CONTACTO
Para consultas sobre estos términos: legal@triexpertservice.com

Última actualización: ${new Date().toLocaleDateString('es-ES')}`
  },
  {
    key: 'privacy_policy',
    name: 'Política de Privacidad',
    icon: Shield,
    description: 'Cómo manejamos y protegemos sus datos personales',
    template: `# POLÍTICA DE PRIVACIDAD - VPS PROXMOX

## 1. INFORMACIÓN QUE RECOPILAMOS
Recopilamos únicamente la información necesaria para proporcionar nuestros servicios:

### Información Personal
- Correo electrónico (para autenticación)
- Información de facturación (procesada por Stripe)
- Dirección IP de conexión (logs de seguridad)

### Información Técnica
- Métricas de uso de recursos del VPS
- Logs de actividad del sistema
- Información de conectividad

## 2. USO DE LA INFORMACIÓN
Utilizamos sus datos para:
- Proporcionar y mantener el servicio VPS
- Procesamiento de pagos y facturación
- Soporte técnico y comunicaciones
- Mejoras del servicio

## 3. COMPARTIR INFORMACIÓN
No compartimos sus datos personales con terceros, excepto:
- Procesadores de pago (Stripe) para transacciones
- Autoridades legales cuando sea requerido por ley
- Proveedores de servicios esenciales bajo acuerdos de confidencialidad

## 4. SEGURIDAD DE DATOS
Implementamos medidas de seguridad robustas:
- Cifrado en tránsito y en reposo
- Acceso restringido a datos personales
- Auditorías de seguridad regulares
- Respaldo seguro de datos

## 5. RETENCIÓN DE DATOS
- Datos de cuenta: mientras mantenga su cuenta activa
- Datos de facturación: 7 años (requerimiento legal)
- Logs de sistema: 90 días
- Datos de soporte: 2 años

## 6. SUS DERECHOS
Tiene derecho a:
- Acceder a sus datos personales
- Corregir información incorrecta
- Eliminar su cuenta y datos
- Portabilidad de datos

## 7. COOKIES Y TECNOLOGÍAS SIMILARES
Utilizamos cookies esenciales para:
- Autenticación de sesión
- Preferencias de usuario
- Análisis de rendimiento básico

## 8. TRANSFERENCIAS INTERNACIONALES
Sus datos pueden ser procesados en:
- Servidores en la Unión Europea
- Infraestructura de Stripe (con salvaguardas GDPR)

## 9. MENORES DE EDAD
Nuestros servicios están dirigidos a mayores de 18 años.

## 10. CONTACTO
Para consultas sobre privacidad: privacy@triexpertservice.com

Última actualización: ${new Date().toLocaleDateString('es-ES')}`
  },
  {
    key: 'sla_agreement',
    name: 'Acuerdo de Nivel de Servicio (SLA)',
    icon: CheckCircle,
    description: 'Garantías de disponibilidad y rendimiento',
    template: `# ACUERDO DE NIVEL DE SERVICIO (SLA) - VPS PROXMOX

## 1. GARANTÍAS DE DISPONIBILIDAD

### Uptime Garantizado
- **Planes Básico y Standard**: 99.5% de uptime mensual
- **Planes Premium y superiores**: 99.9% de uptime mensual
- **Planes Enterprise**: 99.95% de uptime mensual

### Cálculo de Uptime
El uptime se calcula mensualmente excluyendo:
- Mantenimientos programados (máximo 4 horas/mes)
- Interrupciones por fuerza mayor
- Problemas en la conectividad del cliente

## 2. TIEMPO DE RESPUESTA DE SOPORTE

### Soporte Técnico
- **Incidencias Críticas**: < 1 hora
- **Incidencias Altas**: < 4 horas  
- **Incidencias Medias**: < 24 horas
- **Consultas Generales**: < 48 horas

### Definición de Criticidad
- **Crítica**: Servidor completamente inaccesible
- **Alta**: Degradación significativa del rendimiento
- **Media**: Problemas menores que no afectan la operación
- **General**: Consultas sobre configuración o documentación

## 3. GARANTÍAS DE RENDIMIENTO

### Recursos Garantizados
- **CPU**: Recursos mínimos garantizados según plan
- **RAM**: 100% de la RAM asignada disponible
- **Almacenamiento**: Velocidad SSD NVMe garantizada
- **Ancho de Banda**: Según especificaciones del plan

### Conectividad de Red
- **Latencia**: < 50ms dentro del datacenter
- **Pérdida de Paquetes**: < 0.1%
- **Ancho de Banda**: Según plan contratado

## 4. CRÉDITOS POR INCUMPLIMIENTO

### Cálculo de Créditos
Por cada hora de inactividad no programada:
- **99.5% SLA**: 5% del costo mensual diario
- **99.9% SLA**: 10% del costo mensual diario
- **99.95% SLA**: 15% del costo mensual diario

### Límites de Créditos
- Máximo 50% del costo mensual en créditos
- Los créditos se aplican automáticamente a la siguiente factura
- No se otorgan créditos en efectivo

## 5. EXCLUSIONES DEL SLA

No aplica SLA por:
- Mantenimientos programados con notificación previa
- Problemas de conectividad del cliente
- Ataques DDoS dirigidos al cliente
- Modificaciones solicitadas por el cliente
- Fuerza mayor (desastres naturales, etc.)

## 6. MONITOREO Y REPORTES

### Monitoreo Continuo
- Supervisión 24/7 de todos los servicios
- Alertas automáticas por problemas detectados
- Dashboards en tiempo real disponibles para clientes

### Reportes de Disponibilidad
- Reportes mensuales de uptime
- Transparencia total en métricas
- Acceso a histórico de incidencias

## 7. PROCEDIMIENTO DE RECLAMACIÓN

Para reclamar créditos por SLA:
1. Contactar soporte dentro de 7 días del incidente
2. Proporcionar detalles específicos del problema
3. Nuestro equipo investigará y validará la reclamación
4. Créditos aplicados dentro de 30 días

## 8. MEJORA CONTINUA

Nos comprometemos a:
- Inversión continua en infraestructura
- Actualización regular de tecnologías
- Capacitación constante del equipo técnico
- Implementación de mejores prácticas

## 9. CONTACTO SLA
Para consultas sobre SLA: sla@triexpertservice.com

Vigente desde: ${new Date().toLocaleDateString('es-ES')}
Próxima revisión: ${new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString('es-ES')}`
  },
  {
    key: 'acceptable_use_policy',
    name: 'Política de Uso Aceptable',
    icon: Book,
    description: 'Reglas y limitaciones de uso de nuestros servicios',
    template: `# POLÍTICA DE USO ACEPTABLE - VPS PROXMOX

## 1. PROPÓSITO
Esta política define el uso aceptable de nuestros servicios VPS para mantener la seguridad, estabilidad y calidad del servicio para todos los clientes.

## 2. USOS PERMITIDOS

### Aplicaciones Comerciales
✅ Hosting de sitios web y aplicaciones
✅ Bases de datos y APIs
✅ Servidores de desarrollo y testing
✅ Aplicaciones de comercio electrónico
✅ Servicios de backup y almacenamiento

### Aplicaciones Técnicas
✅ Servidores de juegos (con limitaciones de recursos)
✅ Procesamiento de datos
✅ Servicios de VPN personal
✅ Automatización y bots (uso responsable)

## 3. USOS PROHIBIDOS

### Actividades Ilegales
❌ Distribución de contenido ilegal
❌ Violación de derechos de autor
❌ Phishing o fraude
❌ Actividades de hacking o cracking
❌ Distribución de malware o virus

### Abuso de Recursos
❌ Minería de criptomonedas (salvo planes específicos)
❌ Uso excesivo de CPU por períodos prolongados
❌ Spam masivo o email no solicitado
❌ Ataques DDoS o scanning de puertos
❌ Proxy abierto o relay SMTP abierto

### Contenido Problemático
❌ Contenido difamatorio o que incite al odio
❌ Material pornográfico ilegal
❌ Servicios de gambling no autorizados
❌ Venta de productos ilegales

## 4. LÍMITES DE RECURSOS

### CPU y Memoria
- Uso sostenido de CPU >95% durante >2 horas puede ser limitado
- No se permite monopolizar recursos compartidos
- Procesos que afecten otros clientes serán terminados

### Red y Ancho de Banda
- Límites según plan contratado
- Tráfico P2P permitido con moderación
- Prohibido revender ancho de banda

### Almacenamiento
- Prohibido almacenar contenido ilegal
- Backups automáticos no incluyen datos del cliente
- Responsabilidad del cliente mantener sus backups

## 5. MONITOREO Y CUMPLIMIENTO

### Supervisión Automatizada
- Monitoreo continuo de uso de recursos
- Detección automática de patrones sospechosos
- Alertas por uso anómalo

### Investigaciones
- Derecho a investigar reportes de abuso
- Acceso a logs cuando sea necesario para investigación
- Cooperación con autoridades cuando sea requerido

## 6. CONSECUENCIAS POR INCUMPLIMIENTO

### Acciones Progresivas
1. **Advertencia**: Notificación del problema
2. **Limitación**: Restricción de recursos
3. **Suspensión**: Suspensión temporal del servicio
4. **Terminación**: Cancelación permanente sin reembolso

### Infracciones Graves
Para violaciones severas (actividades ilegales, seguridad):
- Suspensión inmediata sin previo aviso
- Terminación del servicio sin reembolso
- Cooperación con autoridades competentes

## 7. REPORTAR ABUSO

Para reportar violaciones:
- Email: abuse@triexpertservice.com
- Incluir evidencia detallada
- Respuesta dentro de 24 horas

## 8. APELACIONES

Si considera que su cuenta fue sancionada incorrectamente:
- Email: appeals@triexpertservice.com
- Proporcionar evidencia de cumplimiento
- Revisión dentro de 72 horas

## 9. ACTUALIZACIONES

Esta política puede ser actualizada con:
- Notificación por email con 30 días de anticipación
- Publicación en nuestro sitio web
- Derecho a cancelar el servicio si no acepta los cambios

## 10. CONTACTO

Para consultas sobre esta política:
- Email: policy@triexpertservice.com
- Teléfono: +1 (555) 123-4567

Efectiva desde: ${new Date().toLocaleDateString('es-ES')}
Última actualización: ${new Date().toLocaleDateString('es-ES')}`
  }
];

export function LegalManagement() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchLegalDocuments();
  }, []);

  const fetchLegalDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('setting_key', legalTemplates.map(t => t.key))
        .order('setting_key', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (template: typeof legalTemplates[0]) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('admin_settings')
        .insert([{
          setting_key: template.key,
          setting_value: template.template,
          description: template.description,
          setting_type: 'text'
        }])
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [...prev, data]);
      setSuccess(`${template.name} creado correctamente`);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const startEditing = (doc: LegalDocument) => {
    setEditingDoc(doc.id);
    setEditContent(doc.setting_value);
    setError(null);
    setSuccess(null);
  };

  const saveDocument = async () => {
    try {
      if (!editingDoc) return;

      const { error } = await supabase
        .from('admin_settings')
        .update({
          setting_value: editContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingDoc);

      if (error) throw error;

      setDocuments(prev => prev.map(doc => 
        doc.id === editingDoc 
          ? { ...doc, setting_value: editContent, updated_at: new Date().toISOString() }
          : doc
      ));

      setSuccess('Documento actualizado correctamente');
      setEditingDoc(null);
      setEditContent('');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const cancelEditing = () => {
    setEditingDoc(null);
    setEditContent('');
    setError(null);
    setSuccess(null);
  };

  const downloadDocument = (doc: LegalDocument) => {
    const template = legalTemplates.find(t => t.key === doc.setting_key);
    const filename = `${template?.name || doc.setting_key}.md`;
    
    const blob = new Blob([doc.setting_value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando documentos legales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestión Legal y Políticas</h2>
        <p className="text-gray-600">Administra términos de servicio, políticas y documentos legales</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Create Missing Documents */}
      {legalTemplates.filter(template => 
        !documents.find(doc => doc.setting_key === template.key)
      ).length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Documentos Faltantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-blue-700 mb-4">
                Los siguientes documentos legales no están configurados. Se recomienda crearlos para cumplir con regulaciones.
              </p>
              
              <div className="grid md:grid-cols-2 gap-3">
                {legalTemplates
                  .filter(template => !documents.find(doc => doc.setting_key === template.key))
                  .map((template) => {
                    const Icon = template.icon;
                    return (
                      <div key={template.key} className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 text-blue-600 mr-3" />
                          <div>
                            <p className="font-medium text-blue-900">{template.name}</p>
                            <p className="text-xs text-blue-600">{template.description}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => createDocument(template)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Crear
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Documents */}
      <div className="grid gap-6">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos legales configurados</h3>
              <p className="text-gray-600 mb-4">Crea los documentos esenciales para tu plataforma</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => {
            const template = legalTemplates.find(t => t.key === doc.setting_key);
            const Icon = template?.icon || FileText;
            const isEditing = editingDoc === doc.id;
            
            return (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Icon className="h-5 w-5 mr-2 text-blue-600" />
                        {template?.name || doc.setting_key}
                      </CardTitle>
                      <p className="text-gray-600 mt-1">{doc.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">
                        Configurado
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Actualizado: {new Date(doc.updated_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Contenido del Documento</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm"
                          placeholder="Contenido en formato Markdown..."
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button onClick={saveDocument} className="bg-green-600 hover:bg-green-700">
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </Button>
                        <Button variant="outline" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                          {doc.setting_value.substring(0, 300)}...
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(doc)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Descargar
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Open preview in new window
                            const newWindow = window.open('', '_blank');
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head>
                                    <title>${template?.name || doc.setting_key}</title>
                                    <style>
                                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
                                      h1, h2, h3 { color: #333; }
                                      code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
                                      pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
                                    </style>
                                  </head>
                                  <body>
                                    <pre style="white-space: pre-wrap;">${doc.setting_value}</pre>
                                  </body>
                                </html>
                              `);
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Vista Previa
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Legal Compliance Info */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Cumplimiento Legal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-green-700">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Documentos Requeridos:</h4>
                <ul className="space-y-1 text-xs">
                  <li>✅ Términos de Servicio (TOS)</li>
                  <li>✅ Política de Privacidad (GDPR)</li>
                  <li>✅ Acuerdo de Nivel de Servicio (SLA)</li>
                  <li>✅ Política de Uso Aceptable (AUP)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Regulaciones Aplicables:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• GDPR (Unión Europea)</li>
                  <li>• CCPA (California)</li>
                  <li>• PCI DSS (Pagos)</li>
                  <li>• ISO 27001 (Seguridad)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white border border-green-200 rounded p-3 mt-4">
              <p className="text-xs text-green-600">
                <strong>Recomendación:</strong> Revisa y personaliza todos los documentos según tu jurisdicción específica. 
                Consulta con un abogado especializado en tecnología para asegurar el cumplimiento completo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}