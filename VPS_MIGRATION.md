# Medusa Online Store - Setup and VPS Migration Guide

This guide will help you set up your Medusa online store locally and migrate it to a VPS hosting with Supabase.

## 📋 Prerequisites

- Node.js 20+ installed
- PostgreSQL database (Supabase) account
- Redis (optional but recommended for production)
- Git installed

## 🚀 Local Setup

### 1. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   - Go to your [Supabase Dashboard](https://app.supabase.com/)
   - Select your project (or create a new one)
   - Go to **Settings** > **Database**
   - Copy the **Connection String** under "Connection pooling" or "Connection string"
   - Replace `[YOUR-PASSWORD]` and `[PROJECT-REF]` in the `DATABASE_URL`

   Example:
   ```
   DATABASE_URL=postgresql://postgres.xxxxx:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

3. Generate secure secrets:
   ```bash
   # Generate JWT Secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate Cookie Secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
   Update `JWT_SECRET` and `COOKIE_SECRET` in your `.env` file.

### 2. Install Dependencies

Dependencies should already be installed. If not:
```bash
npm install
```

### 3. Run Database Migrations

```bash
npx medusa db:migrate
```

### 4. Seed the Database (Optional)

```bash
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

Your Medusa backend should now be running at:
- **API**: http://localhost:9000
- **Admin**: http://localhost:9000/app

## 🗄️ Supabase Setup

### Creating a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up/login
2. Click **New Project**
3. Fill in:
   - **Organization**: Select or create one
   - **Name**: Your project name
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

4. Wait for the project to be provisioned (2-3 minutes)

### Getting Database Connection String

1. In your Supabase project dashboard, go to **Settings** > **Database**
2. Find the **Connection string** section
3. Choose **Connection pooling** (recommended for serverless/VPS)
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password

**Note**: Supabase uses connection pooling by default. For direct connections, use port `5432` instead of `6543`.

### Enabling Required Extensions

Medusa requires PostgreSQL extensions. In Supabase SQL Editor, run:

```sql
-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## 🚀 VPS Migration Guide

### Option 1: Manual Migration

#### Step 1: Prepare Your VPS

1. **Set up a VPS** (DigitalOcean, Linode, AWS EC2, etc.)
   - Recommended: Ubuntu 22.04 LTS or newer
   - Minimum: 2GB RAM, 1 CPU core
   - Install Node.js 20+:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```

2. **Install PostgreSQL client** (optional, for direct database access):
   ```bash
   sudo apt-get install postgresql-client
   ```

3. **Install Redis** (recommended):
   ```bash
     sudo apt-get update
     sudo apt-get install redis-server
     sudo systemctl enable redis-server
     sudo systemctl start redis-server
   ```

4. **Install PM2** (process manager for Node.js):
   ```bash
   sudo npm install -g pm2
   ```

#### Step 2: Transfer Your Project

1. **Push your code to Git** (GitHub, GitLab, etc.):
   ```bash
   git add .
   git commit -m "Prepare for VPS deployment"
   git push origin main
   ```

2. **On your VPS**, clone the repository:
   ```bash
   git clone <your-repository-url>
   cd online-store-engine
   ```

3. **Install dependencies**:
   ```bash
   npm install --production
   ```

#### Step 3: Configure Environment Variables on VPS

1. **Create `.env` file** on your VPS:
   ```bash
   nano .env
   ```

2. **Update with production values**:
   ```env
   DATABASE_URL=postgresql://postgres.xxxxx:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   REDIS_URL=redis://localhost:6379
   NODE_ENV=production
   STORE_CORS=https://your-store-domain.com
   ADMIN_CORS=https://your-admin-domain.com
   AUTH_CORS=https://your-admin-domain.com
   JWT_SECRET=your-generated-jwt-secret
   COOKIE_SECRET=your-generated-cookie-secret
   ```

3. **Update Supabase settings**:
   - Go to Supabase Dashboard > **Settings** > **API**
   - Add your VPS IP address to **Allowed IPs** if you're using IP restrictions
   - Or use Supabase's built-in authentication

#### Step 4: Build and Run

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Run database migrations**:
   ```bash
   npx medusa db:migrate
   ```

3. **Start with PM2**:
   ```bash
   pm2 start npm --name "medusa-store" -- start
   pm2 save
   pm2 startup
   ```

4. **Set up Nginx reverse proxy** (recommended):
   ```bash
   sudo apt-get install nginx
   ```

   Create `/etc/nginx/sites-available/medusa`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:9000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/medusa /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 2: Using Docker (Recommended)

1. **Create `Dockerfile`**:
   ```dockerfile
   FROM node:20-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --production

   COPY . .
   RUN npm run build

   EXPOSE 9000

   CMD ["npm", "start"]
   ```

2. **Create `docker-compose.yml`**:
   ```yaml
   version: '3.8'
   services:
     medusa:
       build: .
       ports:
         - "9000:9000"
       env_file:
         - .env
       restart: unless-stopped
       depends_on:
         - redis
     
     redis:
       image: redis:7-alpine
       restart: unless-stopped
       volumes:
         - redis_data:/data

   volumes:
     redis_data:
   ```

3. **On your VPS**, install Docker and Docker Compose:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   sudo apt-get install docker-compose-plugin
   ```

4. **Deploy**:
   ```bash
   docker compose up -d
   ```

## 🔒 Security Checklist

- [ ] Change default `JWT_SECRET` and `COOKIE_SECRET` to secure random strings
- [ ] Update CORS settings to only allow your domains
- [ ] Use environment variables, never commit `.env` to Git
- [ ] Set up firewall rules (UFW) on VPS:
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] Keep Node.js and dependencies updated
- [ ] Set up automatic backups for Supabase
- [ ] Use SSL/HTTPS for production
- [ ] Configure Supabase RLS (Row Level Security) policies if needed

## 📊 Monitoring

### PM2 Monitoring

```bash
# View logs
pm2 logs medusa-store

# Monitor resources
pm2 monit

# Restart application
pm2 restart medusa-store
```

### Health Check

Your Medusa API should respond at:
- Health: `http://your-domain.com/health`

## 🔄 Updating Your Store

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Install dependencies** (if package.json changed):
   ```bash
   npm install --production
   ```

3. **Run migrations** (if any):
   ```bash
   npx medusa db:migrate
   ```

4. **Rebuild**:
   ```bash
   npm run build
   ```

5. **Restart**:
   ```bash
   pm2 restart medusa-store
   # or
   docker compose restart
   ```

## 🐛 Troubleshooting

### Database Connection Issues

- Verify your Supabase connection string is correct
- Check if your VPS IP is whitelisted in Supabase
- Ensure you're using the correct port (6543 for pooling, 5432 for direct)

### Redis Connection Issues

- Verify Redis is running: `sudo systemctl status redis-server`
- Check Redis URL in `.env`
- Test connection: `redis-cli ping` (should return `PONG`)

### Application Won't Start

- Check logs: `pm2 logs medusa-store` or `docker logs <container-name>`
- Verify all environment variables are set
- Ensure database migrations have run
- Check Node.js version: `node --version` (should be 20+)

## 📚 Additional Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Medusa Deployment Guide](https://docs.medusajs.com/deployment/overview)
- [Medusa Community Discord](https://discord.gg/medusajs)

## 🆘 Support

If you encounter issues:
1. Check the Medusa documentation
2. Search [GitHub Issues](https://github.com/medusajs/medusa/issues)
3. Ask for help on [Discord](https://discord.gg/medusajs)

---

**Good luck with your Medusa store! 🚀**

