import {
  isInstallationEvent,
  isInstallationRepositoriesEvent,
} from "../types";
import {
  updateRepositoryInstallation,
  logActivity,
  getOrCreateUserByGithubId,
} from "../db-utils";

export async function handleInstallationEvent(payload: unknown): Promise<void> {
  if (!isInstallationEvent(payload)) {
    console.error("[Installation Handler] Invalid payload type");
    return;
  }

  const { action, installation, sender, repositories } = payload;
  
  console.log(`[Installation Handler] Processing ${action} for installation ${installation.id}`);

  try {
    // Get or create sender user for activity logging
    const senderUser = await getOrCreateUserByGithubId(
      sender.id,
      sender.login,
      sender.email
    );

    if (!senderUser) {
      console.error("[Installation Handler] Failed to get/create sender user");
      return;
    }

    switch (action) {
      case "created":
        // When an installation is created, update all repositories
        if (repositories) {
          for (const repo of repositories) {
            await updateRepositoryInstallation(repo.full_name, installation.id);
            console.log(`[Installation Handler] Added installation ${installation.id} to ${repo.full_name}`);
          }
        }

        // Log activity
        await logActivity(
          "repository_added",
          {
            action: "installation_created",
            installation_id: installation.id,
            account: installation.account.login,
            repository_count: repositories?.length || 0,
            repository_names: repositories?.map(r => r.full_name) || [],
          },
          senderUser.id
        );
        break;

      case "deleted":
        // When an installation is deleted, remove it from all repositories
        if (repositories) {
          for (const repo of repositories) {
            await updateRepositoryInstallation(repo.full_name, null);
            console.log(`[Installation Handler] Removed installation from ${repo.full_name}`);
          }
        }

        // Log activity
        await logActivity(
          "repository_removed",
          {
            action: "installation_deleted",
            installation_id: installation.id,
            account: installation.account.login,
            repository_count: repositories?.length || 0,
            repository_names: repositories?.map(r => r.full_name) || [],
          },
          senderUser.id
        );
        break;

      case "suspend":
      case "unsuspend":
        // Log these actions but don't modify repositories
        await logActivity(
          "webhook_received",
          {
            action: `installation_${action}`,
            installation_id: installation.id,
            account: installation.account.login,
          },
          senderUser.id
        );
        break;

      default:
        console.log(`[Installation Handler] Unhandled action: ${action}`);
    }

    console.log(`[Installation Handler] Successfully processed ${action}`);
  } catch (error) {
    console.error("[Installation Handler] Error processing installation event:", error);
    // Don't throw - we want webhook to return 200 OK to GitHub
  }
}

export async function handleInstallationRepositoriesEvent(payload: unknown): Promise<void> {
  if (!isInstallationRepositoriesEvent(payload)) {
    console.error("[Installation Repos Handler] Invalid payload type");
    return;
  }

  const { action, installation, repositories_added, repositories_removed, sender } = payload;
  
  console.log(`[Installation Repos Handler] Processing ${action} for installation ${installation.id}`);

  try {
    // Get or create sender user for activity logging
    const senderUser = await getOrCreateUserByGithubId(
      sender.id,
      sender.login,
      sender.email
    );

    if (!senderUser) {
      console.error("[Installation Repos Handler] Failed to get/create sender user");
      return;
    }

    // Handle added repositories
    if (repositories_added && repositories_added.length > 0) {
      for (const repo of repositories_added) {
        await updateRepositoryInstallation(repo.full_name, installation.id);
        console.log(`[Installation Repos Handler] Added installation ${installation.id} to ${repo.full_name}`);
      }

      // Log activity for added repositories
      await logActivity(
        "repository_added",
        {
          action: "repositories_added",
          installation_id: installation.id,
          account: installation.account.login,
          repository_count: repositories_added.length,
          repository_names: repositories_added.map(r => r.full_name),
        },
        senderUser.id
      );
    }

    // Handle removed repositories
    if (repositories_removed && repositories_removed.length > 0) {
      for (const repo of repositories_removed) {
        await updateRepositoryInstallation(repo.full_name, null);
        console.log(`[Installation Repos Handler] Removed installation from ${repo.full_name}`);
      }

      // Log activity for removed repositories
      await logActivity(
        "repository_removed",
        {
          action: "repositories_removed",
          installation_id: installation.id,
          account: installation.account.login,
          repository_count: repositories_removed.length,
          repository_names: repositories_removed.map(r => r.full_name),
        },
        senderUser.id
      );
    }

    console.log(`[Installation Repos Handler] Successfully processed ${action}`);
  } catch (error) {
    console.error("[Installation Repos Handler] Error processing installation repositories event:", error);
    // Don't throw - we want webhook to return 200 OK to GitHub
  }
}