import { useState } from 'react';
import { TemplateSelector } from './TemplateSelector';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Product } from '../stripe-config';
import { templates } from '../template-config';
import { supabase } from '../lib/supabase';
import { Server, Cpu, HardDrive, Network } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onPurchaseStart?: () => void;
  onPurchaseComplete?: () => void;
}

export function ProductCard({ product, onPurchaseStart, onPurchaseComplete }: ProductCardProps) {
  const [loading, setLoading] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    product.defaultTemplate || product.allowedTemplates?.[0] || 101
  );

  const handlePurchase = async () => {
    setLoading(true);
    onPurchaseStart?.();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: product.priceId,
          mode: product.mode,
          template_id: selectedTemplateId,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la sesión de pago');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert(error instanceof Error ? error.message : 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const getPriceText = () => {
    if (product.mode === 'subscription') {
      return `$${product.price.toFixed(2)}/mes`;
    }
    return `$${product.price.toFixed(2)}`;
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center mb-3">
          <Server className="h-6 w-6 text-blue-600 mr-2" />
          <CardTitle className="text-xl">{product.name}</CardTitle>
        </div>
        <CardDescription className="text-sm text-gray-600">
          {product.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="mb-4">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {getPriceText()}
          </div>
          {product.mode === 'subscription' && (
            <div className="text-sm text-gray-500">Facturación mensual</div>
          )}
        </div>
        
        {product.specs && (
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <Cpu className="h-4 w-4 text-gray-500 mr-2" />
              <span>{product.specs.cpu}</span>
            </div>
            <div className="flex items-center text-sm">
              <HardDrive className="h-4 w-4 text-gray-500 mr-2" />
              <span>{product.specs.ram}</span>
            </div>
            <div className="flex items-center text-sm">
              <HardDrive className="h-4 w-4 text-gray-500 mr-2" />
              <span>{product.specs.disk}</span>
            </div>
            <div className="flex items-center text-sm">
              <Network className="h-4 w-4 text-gray-500 mr-2" />
              <span>{product.specs.bandwidth}</span>
            </div>
          </div>
        )}

        {/* Template Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Sistema Operativo</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showTemplateSelector ? 'Ocultar' : 'Cambiar'}
            </Button>
          </div>
          
          {selectedTemplate && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{selectedTemplate.icon}</span>
                <div>
                  <p className="font-medium text-sm">{selectedTemplate.name}</p>
                  <p className="text-xs text-gray-600">{selectedTemplate.description}</p>
                </div>
              </div>
            </div>
          )}
          
          {showTemplateSelector && product.allowedTemplates && (
            <div className="mt-4">
              <TemplateSelector
                allowedTemplateIds={product.allowedTemplates}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={setSelectedTemplateId}
              />
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handlePurchase} 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Procesando...' : `Contratar VPS con ${selectedTemplate?.name || 'SO Seleccionado'}`}
        </Button>
      </CardFooter>
    </Card>
  );
}