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

export const products: Product[] = [
  {
    id: 'vps-basic-1',
    priceId: 'price_1S1eJ0JkHWBWzjwgVcQlj38g',
    name: 'VPS Básico',
    description: 'Perfecto para proyectos pequeños y desarrollo',
    mode: 'subscription',
    price: 20.00,
    defaultTemplate: 101, // Ubuntu 24.04 LTS
    allowedTemplates: [101, 102, 103, 104, 105], // Ubuntu y Debian
    specs: {
      cpu: '1 vCPU',
      ram: '2 GB RAM',
      disk: '40 GB SSD',
      bandwidth: '2 TB'
    }
  },
  {
    id: 'vps-standard-1',
    priceId: 'price_1S1eNaJkHWBWzjwgqqUih4iB',
    name: 'VPS Standard',
    description: 'Ideal para sitios web y aplicaciones medianas',
    mode: 'subscription',
    price: 20.00,
    defaultTemplate: 101, // Ubuntu 24.04 LTS
    allowedTemplates: [101, 102, 103, 104, 105, 107], // Ubuntu, Debian, AlmaLinux
    specs: {
      cpu: '2 vCPUs',
      ram: '4 GB RAM',
      disk: '80 GB SSD',
      bandwidth: '4 TB'
    }
  },
  {
    id: 'vps-premium-1',
    priceId: 'price_1S1eP2JkHWBWzjwgyoi0mSUW',
    name: 'VPS Premium',
    description: 'Para aplicaciones de alto rendimiento',
    mode: 'subscription',
    price: 24.00,
    defaultTemplate: 101, // Ubuntu 24.04 LTS
    allowedTemplates: [101, 102, 103, 104, 105, 107, 108], // Todas las plantillas
    specs: {
      cpu: '4 vCPUs',
      ram: '8 GB RAM',
      disk: '160 GB SSD',
      bandwidth: '8 TB'
    }
  },
  {
    id: 'vps-pro-1',
    priceId: 'price_1S1eQ0JkHWBWzjwgou10GBIC',
    name: 'VPS Pro',
    description: 'Máximo rendimiento para proyectos empresariales',
    mode: 'subscription',
    price: 50.00,
    defaultTemplate: 107, // AlmaLinux 9.6 (empresarial)
    allowedTemplates: [101, 102, 103, 104, 105, 107, 108], // Todas las plantillas
    specs: {
      cpu: '8 vCPUs',
      ram: '16 GB RAM',
      disk: '320 GB SSD',
      bandwidth: '16 TB'
    }
  },
  {
    id: 'vps-enterprise-1',
    priceId: 'price_1S1eR4JkHWBWzjwgRUrEqCu5',
    name: 'VPS Enterprise',
    description: 'Solución completa para grandes aplicaciones',
    mode: 'subscription',
    price: 50.00,
    defaultTemplate: 107, // AlmaLinux 9.6 (empresarial)
    allowedTemplates: [101, 102, 103, 104, 105, 107, 108], // Todas las plantillas
    specs: {
      cpu: '12 vCPUs',
      ram: '32 GB RAM',
      disk: '640 GB SSD',
      bandwidth: '24 TB'
    }
  }
];

export function getProductByPriceId(priceId: string): Product | undefined {
  return products.find(product => product.priceId === priceId);
}

export function getProductById(id: string): Product | undefined {
  return products.find(product => product.id === id);
}