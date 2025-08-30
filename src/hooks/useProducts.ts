import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  defaultTemplate?: number;
  allowedTemplates?: number[];
  specs?: {
    cpu: string;
    ram: string;
    disk: string;
    bandwidth: string;
  };
}

interface VMSpec {
  id: string;
  price_id: string;
  name: string;
  cpu_cores: number;
  ram_gb: number;
  disk_gb: number;
  bandwidth_gb: number;
  monthly_price: number;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setError(null);
      
      const { data: vmSpecs, error } = await supabase
        .from('vm_specs')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (error) throw error;

      const convertedProducts = vmSpecs.map(convertVMSpecToProduct);
      setProducts(convertedProducts);
      
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProducts = () => {
    setLoading(true);
    fetchProducts();
  };

  return {
    products,
    loading,
    error,
    refreshProducts
  };
}

function convertVMSpecToProduct(vmSpec: VMSpec): Product {
  // Generate product ID based on name
  const productId = vmSpec.name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Determine allowed templates based on plan level
  let allowedTemplates: number[];
  let defaultTemplate: number;
  
  if (vmSpec.name.toLowerCase().includes('básico') || vmSpec.name.toLowerCase().includes('basic')) {
    allowedTemplates = [101, 102, 104, 105]; // Ubuntu y Debian básico
    defaultTemplate = 101; // Ubuntu 24.04 LTS
  } else if (vmSpec.name.toLowerCase().includes('standard')) {
    allowedTemplates = [101, 102, 103, 104, 105, 107]; // Ubuntu, Debian, AlmaLinux
    defaultTemplate = 101; // Ubuntu 24.04 LTS
  } else if (vmSpec.name.toLowerCase().includes('premium')) {
    allowedTemplates = [101, 102, 103, 104, 105, 107, 108]; // Todas menos experimentales
    defaultTemplate = 101; // Ubuntu 24.04 LTS
  } else if (vmSpec.name.toLowerCase().includes('pro') || vmSpec.name.toLowerCase().includes('enterprise')) {
    allowedTemplates = [101, 102, 103, 104, 105, 107, 108, 109, 110]; // Todas las plantillas
    defaultTemplate = 107; // AlmaLinux 9 (empresarial)
  } else {
    // Default para cualquier otro plan
    allowedTemplates = [101, 102, 104, 105];
    defaultTemplate = 101;
  }

  // Generate description based on specs
  const description = `${vmSpec.cpu_cores} vCPU${vmSpec.cpu_cores > 1 ? 's' : ''}, ${vmSpec.ram_gb}GB RAM, ${vmSpec.disk_gb}GB SSD - ${
    vmSpec.name.toLowerCase().includes('básico') || vmSpec.name.toLowerCase().includes('basic')
      ? 'Perfecto para proyectos pequeños y desarrollo'
      : vmSpec.name.toLowerCase().includes('standard')
      ? 'Ideal para sitios web y aplicaciones medianas'
      : vmSpec.name.toLowerCase().includes('premium')
      ? 'Para aplicaciones de alto rendimiento'
      : vmSpec.name.toLowerCase().includes('pro')
      ? 'Máximo rendimiento para proyectos empresariales'
      : vmSpec.name.toLowerCase().includes('enterprise')
      ? 'Solución completa para grandes aplicaciones'
      : 'Servidor virtual potente y confiable'
  }`;

  return {
    id: productId,
    priceId: vmSpec.price_id,
    name: vmSpec.name,
    description,
    mode: 'subscription', // Todos los planes son suscripciones
    price: Number(vmSpec.monthly_price),
    defaultTemplate,
    allowedTemplates,
    specs: {
      cpu: `${vmSpec.cpu_cores} vCPU${vmSpec.cpu_cores > 1 ? 's' : ''}`,
      ram: `${vmSpec.ram_gb} GB RAM`,
      disk: `${vmSpec.disk_gb} GB SSD`,
      bandwidth: `${vmSpec.bandwidth_gb} TB`
    }
  };
}