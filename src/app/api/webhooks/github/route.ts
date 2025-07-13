import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, parseWebhookHeaders } from "@/lib/github-app";
import {
  handleIssueEvent,
  handleIssueCommentEvent,
  handlePullRequestEvent,
  handlePullRequestReviewEvent,
  handleInstallationEvent,
  handleInstallationRepositoriesEvent,
} from "./handlers";
// import { logActivity } from "./db-utils"; // Activities table removed
// import { createServiceRoleClient } from "@/lib/supabase/server"; // Removed - activity logging removed

// Cache for checking duplicate deliveries (simple in-memory cache)
const processedDeliveries = new Set<string>();
const MAX_CACHE_SIZE = 1000;

// For testing purposes - exposed via test utils
if (typeof global !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).__clearWebhookDeliveryCache = () => {
    processedDeliveries.clear();
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventType: string | undefined;
  let deliveryId: string | undefined;

  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Parse headers
    const webhookHeaders = parseWebhookHeaders(request.headers);
    const signature = webhookHeaders['x-hub-signature-256'];
    eventType = webhookHeaders['x-github-event'];
    deliveryId = webhookHeaders['x-github-delivery'];

    console.log(`[GitHub Webhook] Event: ${eventType}, Delivery: ${deliveryId}`);

    // Check for duplicate delivery (idempotency)
    if (deliveryId && processedDeliveries.has(deliveryId)) {
      console.log(`[GitHub Webhook] Duplicate delivery detected: ${deliveryId}`);
      return NextResponse.json(
        { message: "Webhook already processed", delivery_id: deliveryId },
        { status: 200 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("[GitHub Webhook] Invalid signature");
      
      // Log failed webhook attempt (activity logging removed - no activities table)

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
      case "ping":
        console.log("[GitHub Webhook] Received ping event");
        break;
      default:
        console.log(`[GitHub Webhook] Unhandled event type: ${eventType}`);
        
        // Log unhandled event (activity logging removed - no activities table)
    }

    // Add to processed deliveries cache
    if (deliveryId) {
      processedDeliveries.add(deliveryId);
      
      // Clean up cache if it gets too large
      if (processedDeliveries.size > MAX_CACHE_SIZE) {
        const entriesToDelete = processedDeliveries.size - MAX_CACHE_SIZE / 2;
        const iterator = processedDeliveries.values();
        for (let i = 0; i < entriesToDelete; i++) {
          const result = iterator.next();
          if (!result.done && result.value) {
            processedDeliveries.delete(result.value);
          }
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[GitHub Webhook] Successfully processed in ${processingTime}ms`);

    return NextResponse.json(
      { 
        message: "Webhook processed successfully",
        event: eventType,
        delivery_id: deliveryId,
        processing_time_ms: processingTime,
      },
      { status: 200 }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[GitHub Webhook] Error processing webhook:", error);
    
    // Log webhook error (activity logging removed - no activities table)

    // Always return 200 OK to GitHub to prevent retries
    // GitHub will mark the webhook as failed if we return an error status
    return NextResponse.json(
      { 
        message: "Webhook received but processing failed",
        event: eventType,
        delivery_id: deliveryId,
        processing_time_ms: processingTime,
      },
      { status: 200 }
    );
  }
}

export async function GET() {
  // For testing purposes
  return NextResponse.json({
    message: "GitHub webhook endpoint is working",
    info: "This endpoint accepts POST requests from GitHub",
  });
}
