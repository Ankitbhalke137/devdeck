import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { type, ...data } = await request.json();

  if (type === "send-message") {
    console.log("Message received:", data);
    return NextResponse.json({ status: "message_received", data });
  }

  if (type === "check") {
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ status: "acknowledged" });
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}