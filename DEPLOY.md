# Deployment Guide for EasyPanel

## Quick Deploy to EasyPanel

### 1. Prerequisites
- EasyPanel account
- GitHub repository connected
- Supabase project configured

### 2. EasyPanel Configuration

#### Environment Variables
Set these in EasyPanel's Environment Variables section:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://bhnilgmmzedmhhmdasrn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobmlsZ21temVkbWhobWRhc3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDU2MTQsImV4cCI6MjA2OTY4MTYxNH0.TIdQqw4_2yGfe8NCCS05OwgU6SQmt5MCTdtB1E92NBk

# Application
NODE_ENV=production
```

#### Service Configuration
- **Type**: Docker Compose
- **Build Context**: Repository root
- **Compose File**: `docker-compose.yml`
- **Port**: 80
- **Health Check**: `/health`

### 3. Supabase Edge Functions

Ensure these environment variables are set in **Supabase Dashboard → Settings → Edge Functions**:

```bash
# Proxmox Server Connection
PVE_API_URL=https://pve.triexpertservice.com:8006/api2/json
PVE_TOKEN_ID=root@pam!server  
PVE_TOKEN_SECRET=uae617333-2efc-4174-bd29-bd8455f8e934
PVE_DEFAULT_NODE=pve
PVE_TLS_INSECURE=true

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 4. Deploy Steps

1. **Connect Repository**:
   - Link your GitHub repository to EasyPanel
   - Set branch to `main`

2. **Configure Service**:
   - Service Type: `Docker Compose`
   - Dockerfile: `Dockerfile`
   - Build Context: Repository root
   - Port Mapping: `80:80`

3. **Set Environment Variables**:
   - Add all variables from step 2
   - Ensure no quotes around values

4. **Deploy**:
   - Click "Deploy" in EasyPanel
   - Monitor build logs for any issues

### 5. Domain Configuration

After successful deployment:

1. **Custom Domain** (Optional):
   - Add your domain in EasyPanel
   - Configure DNS to point to EasyPanel's IP
   - SSL will be automatically provisioned

2. **Stripe Webhook URL**:
   ```
   https://yourdomain.com/webhook-url
   ```
   (Configure in Stripe Dashboard)

### 6. Verification

After deployment, verify:

- ✅ Application loads at your domain
- ✅ Authentication works (login/signup)
- ✅ VPS plans are visible
- ✅ Stripe checkout works
- ✅ Admin panel accessible (with admin account)

### 7. Monitoring

EasyPanel provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Network usage
- **Health Checks**: Automatic health monitoring
- **Alerts**: Email notifications for issues

### 8. Scaling

For high traffic:
- Enable **Auto-scaling** in EasyPanel
- Configure **Load Balancer** if multiple instances
- Monitor **Resource Usage** and upgrade plan if needed

### 9. Troubleshooting

Common issues:

#### Build Fails
- Check environment variables are set correctly
- Verify Supabase URL and key are valid
- Check for syntax errors in code

#### App Doesn't Load
- Verify port 80 is exposed
- Check nginx configuration
- Review application logs

#### Authentication Issues
- Verify Supabase credentials
- Check CORS settings in Supabase
- Ensure redirect URLs are configured

#### Payment Issues
- Verify Stripe keys in Supabase Edge Functions
- Check webhook endpoints
- Test with Stripe test mode

### 10. Support

For deployment issues:
- Check EasyPanel documentation
- Review application logs in EasyPanel dashboard
- Contact support if persistent issues

---

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Supabase RLS policies tested
- [ ] Stripe webhooks configured
- [ ] Domain and SSL configured
- [ ] Admin account created
- [ ] VM specs populated in database
- [ ] Proxmox server accessible
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured

## Security Notes

- Supabase anon key is safe to expose (frontend only)
- Stripe and Proxmox secrets are in Supabase Edge Functions only
- All API calls go through Supabase (secure)
- RLS policies protect user data
- Regular security updates recommended