# VPS Proxmox Platform - Docker Management

.PHONY: help build up down logs clean dev prod deploy

# Default target
help:
	@echo "VPS Proxmox Platform - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-build    - Build and start development environment"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production environment"
	@echo ""
	@echo "Management:"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - Show logs from all services"
	@echo "  make logs-app     - Show logs from app only"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Remove containers and volumes"
	@echo "  make clean-all    - Remove everything including images"
	@echo "  make backup-db    - Backup PostgreSQL database"
	@echo "  make restore-db   - Restore PostgreSQL database"

# Development commands
dev:
	docker-compose -f docker-compose.yml -f docker-compose.override.yml up

dev-build:
	docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build

# Production commands
prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-build:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Basic management
up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-app:
	docker-compose logs -f app

# Cleaning
clean:
	docker-compose down -v
	docker system prune -f

clean-all:
	docker-compose down -v --rmi all
	docker system prune -af

# Database operations
backup-db:
	docker-compose exec postgres pg_dump -U postgres vps_platform > backup_$(date +%Y%m%d_%H%M%S).sql

restore-db:
	@echo "Usage: make restore-db FILE=backup_file.sql"
	@if [ -z "$(FILE)" ]; then echo "Error: Please specify FILE parameter"; exit 1; fi
	docker-compose exec -T postgres psql -U postgres vps_platform < $(FILE)

# Health checks
status:
	docker-compose ps
	docker-compose exec app curl -f http://localhost/health || echo "App health check failed"
	docker-compose exec redis redis-cli ping || echo "Redis health check failed"
	docker-compose exec postgres pg_isready -U postgres || echo "PostgreSQL health check failed"