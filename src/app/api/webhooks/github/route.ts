import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("[GitHub Webhook] Received webhook request");

  try {
    const payload = await request.json();
    console.log("[GitHub Webhook] Payload type:", payload.action || "unknown");

    // In a real implementation, you would:
    // 1. Verify the webhook signature
    // 2. Process the webhook payload
    // 3. Update your database accordingly

    return NextResponse.json(
      { message: "Webhook received successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GitHub Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
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
