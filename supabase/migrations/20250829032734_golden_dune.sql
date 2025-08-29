-- PostgreSQL initialization script for local development
-- This file is only used when running PostgreSQL locally with Docker

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE vps_platform'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vps_platform');

-- Connect to the database
 vps_platform;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: In production, use Supabase hosted database
-- This is only for local development/testing