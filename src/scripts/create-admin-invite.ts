import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function createAdminInvite({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModule = container.resolve(Modules.USER);

  const email = "Kittilsen.stian@gmail.com";

  try {
    // Find the user
    const users = await userModule.listUsers({
      email,
    });
    
    if (!users || users.length === 0) {
      logger.error(`User with email ${email} not found`);
      logger.info("Please create the user first with: npx medusa user -e Kittilsen.stian@gmail.com -p kOkkolille32891657");
      return;
    }
    
    const user = users[0];
    logger.info(`✅ Found user: ${user.email} (ID: ${user.id})`);

    logger.info("⚠️  The user exists but needs to be assigned to an admin team.");
    logger.info("");
    logger.info("To fix this, you can either:");
    logger.info("1. Start your Medusa server: npm run dev");
    logger.info("2. Use the admin API to create an invite, OR");
    logger.info("3. Delete the user and recreate it through the admin dashboard");
    logger.info("");
    logger.info("Alternative solution:");
    logger.info("1. Start server: npm run dev");
    logger.info("2. Visit: http://localhost:9000/app");
    logger.info("3. If you see a login screen, try clicking 'Forgot Password'");
    logger.info("4. Or check if there's a 'Create Account' option");
    logger.info("");
    logger.info("User details:");
    logger.info(`  Email: ${user.email}`);
    logger.info(`  ID: ${user.id}`);
    
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    throw error;
  }
}


