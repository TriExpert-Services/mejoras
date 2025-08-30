import React from 'react';
import { ProductCard } from './ProductCard';
import { useProducts } from '../hooks/useProducts';
import { Card, CardContent } from './ui/card';
import { RefreshCw, Package } from 'lucide-react';

interface ProductGridProps {
  onPurchaseStart?: () => void;
  onPurchaseComplete?: () => void;
}

export function ProductGrid({ onPurchaseStart, onPurchaseComplete }: ProductGridProps) {
  const { products, loading, error, refreshProducts } = useProducts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando planes VPS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error cargando planes</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshProducts}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2 inline" />
            Reintentar
          </button>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay planes disponibles</h3>
          <p className="text-gray-600">Los planes VPS aparecerán aquí cuando estén configurados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onPurchaseStart={onPurchaseStart}
          onPurchaseComplete={onPurchaseComplete}
        />
      ))}
    </div>
  );
}