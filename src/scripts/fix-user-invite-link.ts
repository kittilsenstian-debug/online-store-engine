import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function fixUserInviteLink({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModule = container.resolve(Modules.USER);

  const email = "Kittilsen.stian@gmail.com";

  try {
    logger.info("Fixing user-invite linkage...");

    // Find the current user
    const users = await userModule.listUsers({ email });
    
    if (users.length === 0) {
      logger.error(`No user found with email: ${email}`);
      return;
    }

    const user = users[0];
    logger.info(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Check invites
    const invites = await userModule.listInvites({ email });
    
    logger.info(`Found ${invites.length} invite(s) for this email`);
    
    if (invites.length > 0) {
      invites.forEach((invite: any, index: number) => {
        logger.info(`Invite ${index + 1}:`);
        logger.info(`  ID: ${invite.id}`);
        logger.info(`  Email: ${invite.email}`);
        logger.info(`  Accepted: ${invite.accepted}`);
        logger.info(`  Metadata: ${JSON.stringify(invite.metadata)}`);
      });
    } else {
      logger.warn("No invites found - need to create one");
    }

    logger.info("");
    logger.info("The issue is that the session is looking for an old user ID.");
    logger.info(`Current user ID: ${user.id}`);
    logger.info("The invite might need to be linked to this user, or");
    logger.info("we need to check if there's a session/auth record pointing to the wrong user.");
    logger.info("");
    logger.info("Try these steps:");
    logger.info("1. Clear browser cookies/cache for localhost:9000");
    logger.info("2. Log out completely");
    logger.info("3. Log in again with email: Kittilsen.stian@gmail.com");
    
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    throw error;
  }
}


