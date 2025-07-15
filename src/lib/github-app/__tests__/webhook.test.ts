import { describe, it, expect, vi } from "vitest";
import * as crypto from "crypto";
import { verifyWebhookSignature, parseWebhookHeaders } from "../webhook";

vi.mock("../config", () => ({
  getGitHubAppConfig: () => ({
    appId: "1594213",
    clientId: "test-client",
    clientSecret: "test-secret",
    webhookSecret: "test-webhook-secret",
  }),
}));

describe("GitHub Webhook Utilities", () => {
  describe("verifyWebhookSignature", () => {
    const webhookSecret = "test-webhook-secret";
    const payload = '{"action":"opened","issue":{"number":1}}';

    it("should verify valid signature", () => {
      const signature = `sha256=${crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex")}`;

      const isValid = verifyWebhookSignature(payload, signature);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
      const invalidSignature = "sha256=invalid";
      const isValid = verifyWebhookSignature(payload, invalidSignature);
      expect(isValid).toBe(false);
    });

    it("should reject when signature is undefined", () => {
      const isValid = verifyWebhookSignature(payload, undefined);
      expect(isValid).toBe(false);
    });

    it("should reject signature without sha256 prefix", () => {
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature);
      expect(isValid).toBe(false);
    });
  });

  describe("parseWebhookHeaders", () => {
    it("should parse all webhook headers", () => {
      const headers = new Headers({
        "x-hub-signature-256": "sha256=test",
        "x-github-event": "issues",
        "x-github-delivery": "12345-67890",
      });

      const parsed = parseWebhookHeaders(headers);

      expect(parsed).toEqual({
        "x-hub-signature-256": "sha256=test",
        "x-github-event": "issues",
        "x-github-delivery": "12345-67890",
      });
    });

    it("should handle missing headers", () => {
      const headers = new Headers({
        "x-github-event": "push",
      });

      const parsed = parseWebhookHeaders(headers);

      expect(parsed).toEqual({
        "x-hub-signature-256": undefined,
        "x-github-event": "push",
        "x-github-delivery": undefined,
      });
    });
  });
});
