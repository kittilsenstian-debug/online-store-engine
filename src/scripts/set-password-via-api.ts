import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function setPasswordViaApi({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModule = container.resolve(Modules.USER);
  const authModule = container.resolve(Modules.AUTH);

  const email = "Kittilsen.stian@gmail.com";
  const password = "kOkkolille32891657";

  try {
    logger.info("Setting password via Medusa API...");

    // Find the user
    const users = await userModule.listUsers({ email });
    
    if (!users || users.length === 0) {
      logger.error(`User with email ${email} not found`);
      return;
    }
    
    const user = users[0];
    logger.info(`Found user: ${user.email} (ID: ${user.id})`);

    // Check existing auth providers by querying provider_identity instead
    // AuthIdentity doesn't have entity_id, so we need to find it via provider_identity
    // First, let's try to create the provider directly - if it exists, it will error
    let existingProviders: any[] = [];
    
    try {
      // Try to list all auth identities and filter by entity_id via provider_identity
      // Actually, let's just try creating it - if it exists, we'll handle the error
      logger.info("Checking for existing emailpass provider...");
    } catch (error: any) {
      logger.warn(`Error checking providers: ${error.message}`);
    }

    // Create new auth provider with password using Medusa's API
    // This will properly hash the password
    // If it already exists, we'll catch the error
    let createdProvider;

    logger.info("Creating emailpass provider with password...");
    try {
      [createdProvider] = await authModule.createAuthIdentities([
        {
          provider: "emailpass",
          entity_id: user.id,
          provider_metadata: {
            email: user.email,
            password: password,  // Medusa will hash this
          },
          user_metadata: {
            email: user.email,
          },
        },
      ]);
      logger.info("✅ Created new provider with password");
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("duplicate") || error.message?.includes("UNIQUE")) {
        logger.info("Provider already exists - it was recreated by our SQL delete, so this is unexpected");
        logger.info("Trying to verify...");
        // The provider shouldn't exist if we deleted it, but let's handle it
        throw new Error(`Provider already exists. Make sure you ran DELETE_AND_RECREATE_PROVIDER.sql first. Error: ${error.message}`);
      } else {
        throw error;
      }
    }

    logger.info(`✅ Created auth provider: ${createdProvider.id}`);
    logger.info(`Provider: ${createdProvider.provider}`);
    logger.info(`Entity ID: ${createdProvider.entity_id}`);
    logger.info(`Email: ${createdProvider.user_metadata?.email || 'N/A'}`);

    // Verify the provider was created
    if (createdProvider) {
      logger.info("");
      logger.info("✅ Success! Auth provider created with password.");
      logger.info("");
      logger.info(`Provider ID: ${createdProvider.id}`);
      logger.info(`Provider: ${createdProvider.provider}`);
      logger.info(`Entity ID: ${createdProvider.entity_id}`);
      logger.info("");
      logger.info(`You can now log in at: http://localhost:9000/app`);
      logger.info(`Email: ${email}`);
      logger.info(`Password: ${password}`);
    } else {
      logger.error("❌ Failed to create auth provider - no provider returned");
    }

  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

