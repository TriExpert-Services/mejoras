import React from 'react';
import { ProductCard } from './ProductCard';
import { products } from '../stripe-config';

interface ProductGridProps {
  onPurchaseStart?: () => void;
  onPurchaseComplete?: () => void;
}

export function ProductGrid({ onPurchaseStart, onPurchaseComplete }: ProductGridProps) {
  // Group products by name and price to avoid duplicates
  const uniqueProducts = products.reduce((acc, product) => {
    const key = `${product.name}-${product.price}`;
    if (!acc[key]) {
      acc[key] = product;
    }
    return acc;
  }, {} as Record<string, typeof products[0]>);

  const productList = Object.values(uniqueProducts);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {productList.map((product) => (
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