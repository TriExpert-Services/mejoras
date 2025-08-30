import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { 
  FileImage, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  AlertCircle,
  CheckCircle,
  Download,
  Upload
} from 'lucide-react';

interface OSTemplate {
  id: string;
  name: string;
  os_type: string;
  version: string;
  description: string;
  icon_emoji: string;
  ct_template_path: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function TemplateManagement() {
  const [templates, setTemplates] = useState<OSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    os_type: 'ubuntu',
    version: '',
    description: '',
    icon_emoji: '🟠',
    ct_template_path: '',
    sort_order: 100
  });

  const osTypes = [
    { value: 'ubuntu', label: 'Ubuntu', emoji: '🟠' },
    { value: 'debian', label: 'Debian', emoji: '🔴' },
    { value: 'almalinux', label: 'AlmaLinux', emoji: '🔵' },
    { value: 'rocky', label: 'Rocky Linux', emoji: '🟢' },
    { value: 'centos', label: 'CentOS', emoji: '🟡' },
    { value: 'fedora', label: 'Fedora', emoji: '🔵' },
    { value: 'alpine', label: 'Alpine', emoji: '⚪' },
    { value: 'arch', label: 'Arch Linux', emoji: '🔷' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('os_templates')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setError(null);
      
      // Validate inputs
      if (!newTemplate.name || !newTemplate.version || !newTemplate.ct_template_path) {
        throw new Error('Nombre, versión y ruta de plantilla son obligatorios');
      }

      const { data, error } = await supabase
        .from('os_templates')
        .insert([{
          ...newTemplate,
          is_active: true,
          is_default: false
        }])
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setShowCreateForm(false);
      setNewTemplate({
        name: '',
        os_type: 'ubuntu',
        version: '',
        description: '',
        icon_emoji: '🟠',
        ct_template_path: '',
        sort_order: 100
      });

    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('os_templates')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.map(template => 
        template.id === templateId ? { ...template, is_active: !isActive } : template
      ));
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      // First, remove default from all templates
      await supabase
        .from('os_templates')
        .update({ is_default: false })
        .neq('id', templateId);

      // Then set this one as default
      const { error } = await supabase
        .from('os_templates')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.map(template => ({
        ...template,
        is_default: template.id === templateId
      })));
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('os_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(template => template.id !== templateId));
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Plantillas</h2>
          <p className="text-gray-600">Administra plantillas de sistemas operativos</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-800">Crear Nueva Plantilla</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ej: Ubuntu 24.04 LTS"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de SO</label>
                <select
                  value={newTemplate.os_type}
                  onChange={(e) => {
                    const selectedOS = osTypes.find(os => os.value === e.target.value);
                    setNewTemplate(prev => ({ 
                      ...prev, 
                      os_type: e.target.value,
                      icon_emoji: selectedOS?.emoji || '🟠'
                    }));
                  }}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md"
                >
                  {osTypes.map(os => (
                    <option key={os.value} value={os.value}>
                      {os.emoji} {os.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Versión</label>
                <Input
                  value={newTemplate.version}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="ej: 24.04"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Icono</label>
                <Input
                  value={newTemplate.icon_emoji}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, icon_emoji: e.target.value }))}
                  placeholder="🟠"
                  maxLength={2}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Descripción</label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="ej: Ubuntu 24.04 LTS Container - Rápido y eficiente"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Ruta de Plantilla CT</label>
                <Input
                  value={newTemplate.ct_template_path}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, ct_template_path: e.target.value }))}
                  placeholder="ej: local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Orden</label>
                <Input
                  type="number"
                  value={newTemplate.sort_order}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                  placeholder="100"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button onClick={handleCreateTemplate} className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Crear Plantilla
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay plantillas configuradas</h3>
              <p className="text-gray-600 mb-4">Crea tu primera plantilla para comenzar</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className={template.is_active ? 'border-green-200' : 'border-gray-200'}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{template.icon_emoji}</span>
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="warning" className="text-xs">
                            Por Defecto
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <p className="text-xs text-gray-500 font-mono">{template.ct_template_path}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {template.is_active ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                    
                    <div className="flex gap-1">
                      {!template.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                        >
                          Def.
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(template.id, template.is_active)}
                      >
                        {template.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}