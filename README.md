# VPS Proxmox Platform

A modern React-based platform for selling and managing Proxmox VE virtual private servers with integrated billing and automated provisioning.

## Features

- **React + TypeScript**: Modern frontend with type safety
- **Supabase**: Backend-as-a-Service with authentication and real-time database
- **Tailwind CSS**: Modern, responsive UI framework
- **Stripe Integration**: Complete payment processing and webhooks
- **Proxmox VE API**: Full VM lifecycle management
- **Automated Provisioning**: Automatic VM creation after payment confirmation
- **Docker Compose**: Complete development environment

## Quick Start

1. **Clone and setup**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase configuration
   ```

2. **Start development environment**:
   ```bash
   make dev
   # or
   docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
   ```

3. **Start production environment**:
   ```bash
   make prod
   # or
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

4. **Access the application**:
   - App: http://localhost:3000
   - Postgres: localhost:5432
   - Redis: localhost:6379

## Docker Commands

Use the included Makefile for easy Docker management:

```bash
# Development
make dev          # Start development environment
make dev-build    # Build and start development

# Production  
make prod         # Start production environment
make prod-build   # Build and start production

# Management
make logs         # View all logs
make logs-app     # View app logs only
make down         # Stop all services
make clean        # Clean containers and volumes
make status       # Check health of all services
```

## Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env.local` and configure:

- **Supabase**: Get these from your Supabase project dashboard
- **Stripe**: Configure in Supabase Edge Functions environment variables
- **Proxmox**: Configure in Supabase Edge Functions environment variables

### Proxmox Configuration

1. Create API user and token in Proxmox VE
2. Ensure token has sufficient permissions for VM operations
3. Configure a cloud-init template VM for cloning
4. Set up networking (DHCP or static IP pool)

## Platform Features

### Authentication
- Email/password registration and login
- No email confirmation required
- JWT-based session management

### VPS Plans
- Multiple VPS configurations with different specs
- CPU, RAM, storage, and bandwidth specifications
- Monthly subscription pricing

### Payment Processing
- Secure Stripe integration via edge functions
- Automated subscription management
- Real-time payment confirmation

### Virtual Machines
- Automatic VM creation after payment
- Real-time VM status monitoring
- Start/stop VM controls
- SSH credential management

## Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Custom Components
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **Payments**: Stripe Checkout + Webhooks
- **Infrastructure**: Proxmox VE API Integration
- **Deployment**: Docker + Docker Compose

### Edge Functions

1. **stripe-checkout**: Creates secure checkout sessions
2. **stripe-webhook**: Processes payment confirmations
3. **proxmox-api**: Manages Proxmox VE operations
4. **vm-provisioner**: Handles VM lifecycle management

### Security

- Row Level Security (RLS) on all database tables
- Secure API key management via edge functions
- Stripe webhook signature verification
- CORS and rate limiting

### Database Schema

- **stripe_customers**: User-to-customer mapping
- **stripe_subscriptions**: Subscription management
- **vm_specs**: VPS plan specifications
- **orders**: Order tracking and processing
- **vms**: Virtual machine instances and configuration

## Production Deployment

### Docker Deployment

```bash
# Production deployment
make prod-build

# With monitoring stack
docker-compose --profile monitoring -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Setup

1. **Supabase Project**: Create and configure your Supabase project
2. **Stripe Setup**: Configure products and webhook endpoints
3. **Proxmox Access**: Ensure network connectivity to Proxmox VE
4. **SSL Certificates**: Configure HTTPS for production
5. **Monitoring**: Set up logging and health checks

### Scaling Considerations

- Use Supabase's built-in scaling for database and auth
- Configure Redis clustering for high availability
- Use load balancer (Traefik included) for multiple app instances
- Monitor Proxmox cluster capacity

## Contributing

1. Follow React and TypeScript best practices
2. Maintain component modularity and reusability
3. Add proper error handling for edge functions
4. Test payment flows thoroughly
5. Update this README when adding new functionality

## Support

This platform provides a complete solution for selling and managing Proxmox VPS services with automated provisioning and billing integration.