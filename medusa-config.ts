import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    // Redis configuration for caching, event bus, and workflow engine
    // Optional but recommended for production
    // Uncomment and configure Redis modules when Redis is available
    redisUrl: process.env.REDIS_URL,
  },
  // Redis modules can be added here when Redis is available
  // For now, we'll use in-memory alternatives for development
  // modules: [],
})
