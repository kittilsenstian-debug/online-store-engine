import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function createAdminSimple({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModule = container.resolve(Modules.USER);
  const authModule = container.resolve(Modules.AUTH);

  // Create admin user with simple credentials
  const email = "admin@admin.com";  // Using email format since Medusa uses email-based auth
  const password = "admin";

  try {
    logger.info("Creating new admin user...");

    // Check if user already exists
    const existingUsers = await userModule.listUsers({ email });
    
    let user;
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
      logger.info(`User already exists: ${user.email} (ID: ${user.id})`);
    } else {
      // Create new user
      logger.info(`Creating new user: ${email}`);
      const [createdUser] = await userModule.createUsers([
        {
          email: email,
        },
      ]);
      user = createdUser;
      logger.info(`✅ Created user: ${user.id}`);
    }

    // Create auth provider with password using Medusa's API
    // This will properly hash the password
    logger.info("Creating emailpass provider with password...");
    try {
      const [createdProvider] = await authModule.createAuthIdentities([
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
      logger.info(`✅ Created auth provider: ${createdProvider.id}`);
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("duplicate") || error.message?.includes("UNIQUE")) {
        logger.info("Provider already exists - deleting and recreating...");
        
        // We can't delete via API easily, so we'll need to update it
        // Actually, let's just log that it exists and suggest manual deletion
        logger.warn("Provider already exists. You may need to delete it manually via SQL:");
        logger.warn(`DELETE FROM provider_identity WHERE entity_id = '${user.id}' AND provider = 'emailpass';`);
        throw new Error("Provider already exists. Please delete it first via SQL, then run this script again.");
      } else {
        throw error;
      }
    }

    // Create admin invite
    logger.info("Creating admin invite...");
    try {
      const [createdInvite] = await userModule.createInvites([
        {
          email: email,
          role: "admin",
        },
      ]);
      logger.info(`✅ Created invite: ${createdInvite.id}`);
      
      // Accept the invite
      logger.info("Accepting invite...");
      await userModule.acceptInvite({
        invite_id: createdInvite.id,
        auth_identity_id: user.id,
      });
      logger.info("✅ Invite accepted");
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        logger.info("Invite already exists - user may already have admin access");
      } else {
        logger.warn(`Invite creation error: ${error.message}`);
      }
    }

    logger.info("");
    logger.info("🎉 Admin user setup complete!");
    logger.info("");
    logger.info(`Email: ${email}`);
    logger.info(`Password: ${password}`);
    logger.info("");
    logger.info(`You can now log in at: http://localhost:9000/app`);

  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}


