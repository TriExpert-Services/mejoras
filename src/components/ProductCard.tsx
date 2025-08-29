import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Product } from '../stripe-config';
import { supabase } from '../lib/supabase';

interface ProductCardProps {
  product: Product;
  onPurchaseStart?: () => void;
  onPurchaseComplete?: () => void;
}

export function ProductCard({ product, onPurchaseStart, onPurchaseComplete }: ProductCardProps) {
  const [loading, setLoading] = useState(false);

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-3xl font-bold text-green-600">
          ${product.price.toFixed(2)}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handlePurchase} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Procesando...' : 'Comprar Ahora'}
        </Button>
      </CardFooter>
    </Card>
  );
}