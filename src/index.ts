// Define the shape of your environment so TypeScript is happy
interface Env {
  MY_DATA: KVNamespace;
  SECRET_TOKEN: string;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    // 1. Read current count from storage (default to 0 if not found)
    const storedCount = await env.MY_DATA.get("visit_count");
    const count = storedCount ? parseInt(storedCount) : 0;

    // 2. Increment the count
    const newCount = count + 1;

    // 3. Save the new count back to storage
    await env.MY_DATA.put("visit_count", newCount.toString());

    return new Response(`Hello! This bot has been used ${newCount} times.`);
  },
} satisfies ExportedHandler<Env>;