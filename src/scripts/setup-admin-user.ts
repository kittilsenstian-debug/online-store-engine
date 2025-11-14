import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function setupAdminUser({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const userModule = container.resolve(Modules.USER);
  const authModule = container.resolve(Modules.AUTH);

  const email = "Kittilsen.stian@gmail.com";
  const password = "kOkkolille32891657";

  try {
    // List users to find the one with matching email
    const users = await userModule.listUsers({
      email,
    });
    
    if (!users || users.length === 0) {
      logger.error(`User with email ${email} not found`);
      return;
    }
    
    const user = users[0];
    logger.info(`Found user: ${user.email} (ID: ${user.id})`);

    // Check if user has auth provider
    const authProviders = await authModule.listAuthProviders({
      entity_id: user.id,
    });

    if (!authProviders || authProviders.length === 0) {
      logger.info("No auth provider found, creating one...");
      // Create auth provider for the user
      await authModule.createAuthProviders({
        provider: "emailpass",
        entity_id: user.id,
        provider_metadata: {
          email: user.email,
          password: password,
        },
      });
      logger.info("Auth provider created");
    }

    // List all teams to see if any exist
    const teams = await authModule.listInvites({});
    logger.info(`Found ${teams.length} teams/invites`);

    // Try to create or find a default team and assign user
    try {
      // Get all invites to see team structure
      const invites = await authModule.listInvites({});
      
      // Check if user is already part of a team
      const userInvites = invites.filter((invite: any) => invite.user_id === user.id);
      
      if (userInvites.length === 0) {
        logger.info("User is not part of any team. Creating default team...");
        
        // In Medusa v2, we need to create a team and assign the user
        // The team creation might be done through workflows
        // For now, let's try to invite the user to admin role
        
        logger.info("Attempting to create admin invite for user...");
        
        // Try using the createInvites workflow or direct method
        await authModule.createInvites([
          {
            email: user.email,
            role: "admin",
            token: undefined, // Will be auto-generated
          },
        ]);
        
        logger.info("Admin invite created");
        
        // Accept the invite
        const createdInvites = await authModule.listInvites({
          email: user.email,
        });
        
        if (createdInvites.length > 0) {
          const invite = createdInvites[0];
          await authModule.acceptInvite({
            invite_id: invite.id,
            auth_identity_id: user.id,
          });
          logger.info("Invite accepted - user should now have admin access");
        }
      } else {
        logger.info("User is already part of a team");
      }
    } catch (teamError: any) {
      logger.error(`Team setup error: ${teamError.message}`);
      logger.info("User exists but team assignment might need manual setup");
      logger.info("Try accessing: http://localhost:9000/app and use the 'Forgot Password' option");
    }

    logger.info("Setup complete!");
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    throw error;
  }
}

