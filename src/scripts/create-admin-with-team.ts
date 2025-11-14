import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createInvitesWorkflow, acceptInviteWorkflow } from "@medusajs/medusa/core-flows";

export default async function createAdminWithTeam({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModule = container.resolve(Modules.USER);
  const authModule = container.resolve(Modules.AUTH);

  const email = "Kittilsen.stian@gmail.com";
  const password = "kOkkolille32891657";

  try {
    logger.info("Creating admin user with proper team setup...");

    // Step 1: Create user
    let users = await userModule.listUsers({ email });
    let user;

    if (users.length === 0) {
      logger.info(`Creating user: ${email}`);
      const [createdUser] = await userModule.createUsers([{
        email,
        first_name: "Admin",
        last_name: "User",
      }]);
      user = createdUser;
      logger.info(`✅ User created: ${user.id}`);
    } else {
      user = users[0];
      logger.info(`User already exists: ${user.id}`);
    }

    // Step 2: Create auth provider with password
    try {
      // Get auth identity linked to user
      const link = container.resolve(ContainerRegistrationKeys.LINK);
      
      // Check if auth provider exists
      const authIdentities = await authModule.listAuthIdentities({
        entity_id: user.id,
      });

      if (!authIdentities || authIdentities.length === 0) {
        logger.info("Creating auth provider...");
        
        // Create auth provider
        await authModule.createAuthIdentities([{
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
      logger.warn(`Auth provider creation: ${authError.message}`);
    }

    // Step 3: Create and accept admin invite using workflows
    logger.info("Creating admin invite...");
    try {
      // Check existing invites
      const existingInvites = await userModule.listInvites({ email });

      if (existingInvites.length === 0) {
        // Create invite using workflow
        const { result: invites } = await createInvitesWorkflow(container).run({
          input: {
            invites: [{
              email: user.email,
              role: "admin",
            }],
          },
        });

        if (invites && invites.length > 0) {
          const invite = invites[0];
          logger.info(`✅ Invite created: ${invite.id}`);

          // Accept the invite
          logger.info("Accepting invite...");
          await acceptInviteWorkflow(container).run({
            input: {
              invite_id: invite.id,
              auth_identity_id: user.id,
            },
          });
          logger.info("✅ Invite accepted - user now has admin access!");
        }
      } else {
        logger.info("Invite already exists");
        const invite = existingInvites[0];
        
        if (!invite.accepted) {
          logger.info("Accepting existing invite...");
          await acceptInviteWorkflow(container).run({
            input: {
              invite_id: invite.id,
              auth_identity_id: user.id,
            },
          });
          logger.info("✅ Invite accepted");
        } else {
          logger.info("✅ Invite already accepted");
        }
      }
    } catch (inviteError: any) {
      logger.error(`Invite error: ${inviteError.message}`);
      logger.info("You may need to login and accept invite manually");
    }

    logger.info("");
    logger.info("🎉 Setup complete!");
    logger.info("");
    logger.info(`User: ${email}`);
    logger.info(`Password: ${password}`);
    logger.info(`User ID: ${user.id}`);
    logger.info("");
    logger.info("Try logging in at: http://localhost:9000/app");

  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

