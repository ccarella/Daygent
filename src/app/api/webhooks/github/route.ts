import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, parseWebhookHeaders } from "@/lib/github-app";

export async function POST(request: NextRequest) {
  console.log("[GitHub Webhook] Received webhook request");

  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Parse headers
    const webhookHeaders = parseWebhookHeaders(request.headers);
    const signature = webhookHeaders['x-hub-signature-256'];
    const eventType = webhookHeaders['x-github-event'];
    const deliveryId = webhookHeaders['x-github-delivery'];

    console.log(`[GitHub Webhook] Event: ${eventType}, Delivery: ${deliveryId}`);

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("[GitHub Webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the payload
    const payload = JSON.parse(rawBody);
    console.log("[GitHub Webhook] Payload action:", payload.action || "no action");

    // Process different webhook event types
    switch (eventType) {
      case "issues":
        await handleIssueEvent(payload);
        break;
      case "issue_comment":
        await handleIssueCommentEvent(payload);
        break;
      case "pull_request":
        await handlePullRequestEvent(payload);
        break;
      case "pull_request_review":
        await handlePullRequestReviewEvent(payload);
        break;
      case "installation":
        await handleInstallationEvent(payload);
        break;
      case "installation_repositories":
        await handleInstallationRepositoriesEvent(payload);
        break;
      default:
        console.log(`[GitHub Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json(
      { message: "Webhook processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GitHub Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Event handlers
interface WebhookPayload {
  action?: string;
  issue?: {
    number: number;
    title?: string;
  };
  pull_request?: {
    number: number;
    title?: string;
  };
  installation?: {
    id: number;
    account: {
      login: string;
    };
  };
  repositories_added?: Array<{ full_name: string }>;
  repositories_removed?: Array<{ full_name: string }>;
}

async function handleIssueEvent(payload: WebhookPayload) {
  console.log(`[GitHub Webhook] Processing issue ${payload.action}: #${payload.issue?.number}`);
  // TODO: Implement issue synchronization with database
}

async function handleIssueCommentEvent(payload: WebhookPayload) {
  console.log(`[GitHub Webhook] Processing issue comment ${payload.action}`);
  // TODO: Implement issue comment synchronization
}

async function handlePullRequestEvent(payload: WebhookPayload) {
  console.log(`[GitHub Webhook] Processing PR ${payload.action}: #${payload.pull_request?.number}`);
  // TODO: Implement PR synchronization
}

async function handlePullRequestReviewEvent(payload: WebhookPayload) {
  console.log(`[GitHub Webhook] Processing PR review ${payload.action}`);
  // TODO: Implement PR review synchronization
}

async function handleInstallationEvent(payload: WebhookPayload) {
  console.log(`[GitHub Webhook] Processing installation ${payload.action}`);
  // TODO: Store installation details in database
}

async function handleInstallationRepositoriesEvent(payload: WebhookPayload) {
  console.log(`[GitHub Webhook] Processing installation repositories ${payload.action}`);
  // TODO: Update repository access in database
}

export async function GET() {
  // For testing purposes
  return NextResponse.json({
    message: "GitHub webhook endpoint is working",
    info: "This endpoint accepts POST requests from GitHub",
  });
}
