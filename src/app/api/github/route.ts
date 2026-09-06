import type { NextRequest } from "next/server";

export const config = {
  api: {
    bodyParser: false,
    response: "stream",
  },
};

export default async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.json();

  // Handle push events
  if (payload?.repository?.push?.size) {
    // Process push events
    return new Response(JSON.stringify({ status: "processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle pull request events
  if (payload?.action === "closed" && payload?.pull_request?.merged) {
    const prNumber = payload.pull_request?.number;
    const prTitle = payload.pull_request?.title || "";
    const repoName = payload.repository?.name || "";

    // TODO: In a real app, you would:
    // 1. Find the task associated with this PR
    // 2. Update the task status to "Done" or "In Review"
    // 3. Possibly add a link to the PR

    console.log(`PR #${prNumber} merged: ${prTitle} from ${repoName}`);

    return new Response(JSON.stringify({ status: "pr_merged", prNumber }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle other events
  return new Response(JSON.stringify({ status: "ignored" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}