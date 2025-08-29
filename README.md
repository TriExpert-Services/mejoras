# Proxmox Orchestrator Backend

A production-ready NestJS backend for managing Proxmox VE virtual machines with integrated billing, queue processing, and user management.

## Features

- **NestJS Framework**: Modern, scalable backend architecture
- **Postgres + Prisma**: Robust database layer with type safety
- **Redis + BullMQ**: Reliable job queue system for VM operations
- **Stripe Integration**: Complete payment processing and webhooks
- **Proxmox VE API**: Full VM lifecycle management
- **JWT Authentication**: Secure user authentication and authorization
- **Docker Compose**: Complete development environment

## Quick Start

1. **Clone and setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start development environment**:
   ```bash
   docker-compose up --build
   ```

3. **Access the API**:
   - API: http://localhost:3000
   - Documentation: http://localhost:3000/docs
   - Postgres: localhost:5432
   - Redis: localhost:6379

## Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

- **Database**: Update `DATABASE_URL` if using external Postgres
- **Proxmox**: Configure `PVE_*` variables for your Proxmox cluster
- **Stripe**: Add your Stripe secret key and webhook secret
- **JWT**: Set a strong JWT secret for authentication

### Proxmox Configuration

1. Create API token in Proxmox VE
2. Ensure token has sufficient permissions for VM operations
3. Configure a cloud-init template VM for cloning

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Plans
- `GET /plans` - List available VM plans
- `POST /plans` - Create plan (admin only)

### Orders
- `POST /orders/checkout` - Create Stripe checkout session
- `GET /orders/me` - Get user orders

### Virtual Machines
- `GET /me/vms` - List user VMs
- `GET /me/vms/:id` - Get VM details
- `POST /me/vms/:id/power/:action` - VM power actions
- `POST /me/vms/:id/snapshots` - Create VM snapshot

### Admin
- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/orders` - All orders
- `GET /admin/vms` - All VMs
- `GET /admin/logs` - Audit logs

### Webhooks
- `POST /webhooks/stripe` - Stripe payment webhooks

## Architecture

### Job Processing

The system uses BullMQ for reliable background job processing:

1. **Provision Queue**: Handles VM creation and setup
2. **Power Queue**: Manages VM power state changes
3. **Snapshot Queue**: Creates and manages VM snapshots

### Security

- JWT-based authentication
- Role-based access control (CUSTOMER/ADMIN)
- Stripe webhook signature verification
- Database-level constraints and validation

### Scalability

- Horizontal scaling support via Redis queues
- Configurable worker concurrency
- Database connection pooling
- Proper error handling and retry logic

## Production Deployment

For production deployment:

1. Use proper secrets management
2. Configure SSL certificates for Proxmox
3. Set up monitoring and alerting
4. Implement proper logging
5. Use production-grade Redis and Postgres

## Contributing

1. Follow the modular architecture pattern
2. Add proper error handling and logging
3. Include API documentation with Swagger decorators
4. Write tests for new features
5. Update this README when adding new functionality