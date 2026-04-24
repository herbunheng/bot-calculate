import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import worker from "../src/index";

// Mock global fetch to intercept Telegram API calls
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("Telegram Calculator Bot", () => {
  it("responds with 403 when secret token is missing", async () => {
    const request = new Request("http://example.com", {
      method: "POST",
      body: JSON.stringify({ message: { text: "2+2", chat: { id: 123 } } }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("responds with 405 when method is GET", async () => {
    const request = new Request("http://example.com", {
      headers: { "X-Telegram-Bot-Api-Secret-Token": env.SECRET_TOKEN },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(405);
  });

  it("responds with 200 and processes calculation when valid update is sent", async () => {
    fetchMock.mockResolvedValue(new Response("OK"));
    
    const update = {
      message: {
        text: "10 + 5 * 2",
        chat: { id: 123 },
        from: { id: 456, first_name: "Test" }
      }
    };

    const request = new Request("http://example.com", {
      method: "POST",
      headers: { 
        "X-Telegram-Bot-Api-Secret-Token": env.SECRET_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(update),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");

    // Verify that the calculator result was sent back to Telegram
    // 10 + 5 * 2 = 20
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("sendMessage"),
      expect.objectContaining({
        body: expect.stringContaining('"text":"Result: 20"')
      })
    );
  });

  it("handles invalid math expressions gracefully", async () => {
    fetchMock.mockResolvedValue(new Response("OK"));
    
    const update = {
      message: {
        text: "10 / 0",
        chat: { id: 123 }
      }
    };

    const request = new Request("http://example.com", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": env.SECRET_TOKEN },
      body: JSON.stringify(update),
    });

    const ctx = createExecutionContext();
    await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("sendMessage"),
      expect.objectContaining({
        body: expect.stringContaining("Error: Mathematical error")
      })
    );
  });
});
