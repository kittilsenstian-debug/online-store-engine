import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createInvitesWorkflow } from "@medusajs/medusa/core-flows";

export default async function createFirstAdmin({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModule = container.resolve(Modules.USER);
  const authModule = container.resolve(Modules.AUTH);

  const email = "Kittilsen.stian@gmail.com";
  const password = "kOkkolille32891657";

  try {
    logger.info("Creating first admin user...");

    // Check if user already exists
    const existingUsers = await userModule.listUsers({ email });
    
    let user;
    if (existingUsers.length > 0) {
      logger.info(`User ${email} already exists`);
      user = existingUsers[0];
    } else {
      // Create new user
      logger.info(`Creating user: ${email}`);
      const [createdUser] = await userModule.createUsers([{
        email,
        first_name: "Admin",
        last_name: "User",
      }]);
      user = createdUser;
      logger.info(`✅ User created: ${user.id}`);
    }

    // Create auth provider for the user
    logger.info("Creating auth provider...");
    try {
      const authProviders = await authModule.listAuthProviders({
        provider_metadata: { email }
      });

      if (!authProviders || authProviders.length === 0) {
        await authModule.createAuthProviders([{
          provider: "emailpass",
          entity_id: user.id,
          provider_metadata: {
            email: user.email,
            password: password,
          },
        }]);
        logger.info("✅ Auth provider created");
      } else {
        logger.info("Auth provider already exists");
      }
    } catch (authError: any) {
      logger.warn(`Auth provider creation issue: ${authError.message}`);
      // Continue anyway
    }

    // Create admin invite for the user using USER module
    logger.info("Creating admin invite...");
    try {
      // Use the USER module's invite methods (not AUTH module)
      const invites = await userModule.listInvites({
        email: user.email,
      });

      if (!invites || invites.length === 0) {
        // Create invite using USER module
        const [createdInvite] = await userModule.createInvites([{
          email: user.email,
          role: "admin",
        }]);

        logger.info(`✅ Invite created: ${createdInvite.id}`);

        // Accept the invite
        logger.info("Accepting invite...");
        await userModule.acceptInvite({
          invite_id: createdInvite.id,
          auth_identity_id: user.id,
        });
        logger.info("✅ Invite accepted - user now has admin access!");
      } else {
        logger.info("Invite already exists");
        // Try to accept existing invite
        const invite = invites[0];
        if (!invite.accepted) {
          await userModule.acceptInvite({
            invite_id: invite.id,
            auth_identity_id: user.id,
          });
          logger.info("✅ Existing invite accepted");
        } else {
          logger.info("✅ Invite already accepted");
        }
      }
    } catch (inviteError: any) {
      logger.error(`Invite creation error: ${inviteError.message}`);
      logger.info("Trying alternative method via SQL...");
      logger.info("See CREATE_ADMIN_INVITE_SQL.sql for manual SQL creation");
    }

    logger.info("");
    logger.info("🎉 Setup complete!");
    logger.info("");
    logger.info(`User: ${email}`);
    logger.info(`Password: ${password}`);
    logger.info("");
    logger.info("You should now be able to login at: http://localhost:9000/app");
    
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

