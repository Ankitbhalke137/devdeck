import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();

  // Handle push events
  if (payload?.repository?.push?.size) {
    return NextResponse.json({ status: "processed" });
  }

  // Handle pull request events
  if (payload?.action === "closed" && payload?.pull_request?.merged) {
    const prNumber = payload.pull_request?.number;
    console.log(`PR #${prNumber} merged`);

    return NextResponse.json({ status: "pr_merged", prNumber });
  }

  // Handle other events
  return NextResponse.json({ status: "ignored" });
}