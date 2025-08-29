import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('1d'),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  PVE_API_URL: z.string(),
  PVE_TOKEN_ID: z.string(),
  PVE_TOKEN_SECRET: z.string(),
  PVE_TLS_INSECURE: z.string().transform(v => v === 'true').default('false'),
  PVE_DEFAULT_NODE: z.string(),
  PVE_DEFAULT_BRIDGE: z.string().default('vmbr0'),
  PVE_DEFAULT_VLAN: z.string().transform(Number).default('200'),
  PVE_DEFAULT_STORAGE: z.string().default('local-lvm'),
  PVE_TEMPLATE_VMID: z.string().transform(Number).default('9000'),
  PVE_CI_USER: z.string().default('ubuntu'),
  PVE_SSH_KEYS: z.string().optional(),
});

export const config = configSchema.parse(process.env);
export type Config = z.infer<typeof configSchema>;