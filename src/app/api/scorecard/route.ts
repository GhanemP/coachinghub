import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Scorecard API route is active." });
}
