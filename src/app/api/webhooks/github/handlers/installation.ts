import { isInstallationEvent, isInstallationRepositoriesEvent } from "../types";
import {
  updateRepositoryInstallation,
  getOrCreateUserByGithubId,
} from "../db-utils";

export async function handleInstallationEvent(payload: unknown): Promise<void> {
  if (!isInstallationEvent(payload)) {
    console.error("[Installation Handler] Invalid payload type");
    return;
  }

  const { action, installation, sender, repositories } = payload;

  console.log(
    `[Installation Handler] Processing ${action} for installation ${installation.id}`,
  );

  try {
    // Get or create sender user
    const senderUser = await getOrCreateUserByGithubId(
      sender.id,
      sender.login,
      sender.email,
    );

    if (!senderUser) {
      console.error("[Installation Handler] Failed to get/create sender user");
      return;
    }

    switch (action) {
      case "created":
        // When an installation is created, mark all repositories as installed
        if (repositories) {
          for (const repo of repositories) {
            await updateRepositoryInstallation(repo.full_name, installation.id);
            console.log(
              `[Installation Handler] Marked ${repo.full_name} as installed`,
            );
          }
        }

        // Activity logging removed - no activities table
        break;

      case "deleted":
        // When an installation is deleted, remove it from all repositories
        if (repositories) {
          for (const repo of repositories) {
            await updateRepositoryInstallation(repo.full_name, null);
            console.log(
              `[Installation Handler] Marked ${repo.full_name} as uninstalled`,
            );
          }
        }

        // Activity logging removed - no activities table
        break;

      case "suspend":
      case "unsuspend":
        // Log these actions but don't modify repositories
        // Activity logging removed - no activities table
        break;

      default:
        console.log(`[Installation Handler] Unhandled action: ${action}`);
    }

    console.log(`[Installation Handler] Successfully processed ${action}`);
  } catch (error) {
    console.error("[Installation Handler] Error processing event:", error);
    throw error;
  }
}

export async function handleInstallationRepositoriesEvent(
  payload: unknown,
): Promise<void> {
  if (!isInstallationRepositoriesEvent(payload)) {
    console.error("[Installation Repos Handler] Invalid payload type");
    return;
  }

  const {
    action,
    installation,
    sender,
    repositories_added = [],
    repositories_removed = [],
  } = payload;

  console.log(
    `[Installation Repos Handler] Processing ${action} for installation ${installation.id}`,
  );

  try {
    // Get or create sender user
    const senderUser = await getOrCreateUserByGithubId(
      sender.id,
      sender.login,
      sender.email,
    );

    if (!senderUser) {
      console.error(
        "[Installation Repos Handler] Failed to get/create sender user",
      );
      return;
    }

    // Handle added repositories
    if (repositories_added.length > 0) {
      console.log(
        `[Installation Repos Handler] Adding ${repositories_added.length} repositories`,
      );

      for (const repo of repositories_added) {
        await updateRepositoryInstallation(repo.full_name, installation.id);
        console.log(
          `[Installation Repos Handler] Added installation ${installation.id} to ${repo.full_name}`,
        );
      }

      // Activity logging removed - no activities table
    }

    // Handle removed repositories
    if (repositories_removed.length > 0) {
      console.log(
        `[Installation Repos Handler] Removing ${repositories_removed.length} repositories`,
      );

      for (const repo of repositories_removed) {
        await updateRepositoryInstallation(repo.full_name, null);
        console.log(
          `[Installation Repos Handler] Removed installation from ${repo.full_name}`,
        );
      }

      // Activity logging removed - no activities table
    }

    console.log(
      `[Installation Repos Handler] Successfully processed ${action}`,
    );
  } catch (error) {
    console.error(
      "[Installation Repos Handler] Error processing event:",
      error,
    );
    throw error;
  }
}

export async function handlePullRequestReviewEvent(): Promise<void> {
  // Implementation placeholder
  console.log("[PR Review Handler] Not yet implemented");
}
