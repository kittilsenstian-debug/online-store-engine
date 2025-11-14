import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

export default async function getPublishableKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    logger.info("Fetching publishable API keys...")

    // Use the API Key module service directly
    const apiKeyModuleService = container.resolve(Modules.API_KEY)

    // List all publishable API keys
    const apiKeys = await apiKeyModuleService.listApiKeys({
      type: "publishable",
    })

    if (!apiKeys || apiKeys.length === 0) {
      logger.warn("\n⚠️  No publishable API keys found.")
      logger.info("Run 'npm run seed' to create one, or create it via the Admin Dashboard:")
      logger.info("  Settings > Publishable API Keys > Create Key")
      return
    }

    logger.info("\n✅ Found publishable API keys:")
    apiKeys.forEach((key: any) => {
      logger.info(`  - ${key.title || "Untitled"}: ${key.id}`)
      logger.info(`    Token: ${key.token || 'N/A'}`)
      if (key.created_at) {
        logger.info(`    Created: ${new Date(key.created_at).toLocaleString()}`)
      }
    })

    // Get the first publishable key (usually created by seed script)
    const publishableKey = apiKeys[0]
    
    // In Medusa v2, publishable keys use the token, not the ID
    // The token starts with 'pk_' while the ID starts with 'apk_'
    const keyToUse = publishableKey.token || publishableKey.id
    
    logger.info("\n📋 Use this publishable key in your storefront .env.local:")
    logger.info(`   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${keyToUse}`)
    logger.info("\n✅ Updating storefront/.env.local automatically...")
    
    // Update the .env.local file automatically
    const fs = require("fs")
    const path = require("path")
    const envPath = path.join(process.cwd(), "storefront", ".env.local")
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8")
      // Replace the publishable key line if it exists, or append it
      if (envContent.includes("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=")) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*/,
          `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${keyToUse}`
        )
      } else {
        envContent += `\nNEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${keyToUse}\n`
      }
      fs.writeFileSync(envPath, envContent, "utf8")
      logger.info("✅ Updated storefront/.env.local successfully!")
    } else {
      logger.warn("⚠️  storefront/.env.local not found. Please create it manually.")
    }
  } catch (error: any) {
    logger.error("\n❌ Error fetching publishable keys:")
    logger.error(error.message || error)
    logger.info("\n💡 You can also get the key from the Admin Dashboard:")
    logger.info("   1. Start your backend: npm run dev")
    logger.info("   2. Go to http://localhost:9000/app")
    logger.info("   3. Navigate to Settings > Publishable API Keys")
    logger.info("   4. Copy the key (starts with 'pk_')")
  }
}

