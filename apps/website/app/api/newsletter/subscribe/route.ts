import { NextRequest, NextResponse } from "next/server";

const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_API_URL = "https://api.kit.com/v4/subscribers";

export async function POST(request: NextRequest) {
  if (!KIT_API_KEY) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email_address, first_name } = body;

    if (!email_address) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Call Kit.com API
    const response = await fetch(KIT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIT_API_KEY}`,
      },
      body: JSON.stringify({
        email_address,
        first_name: first_name || undefined,
        state: "active",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Kit.com API error:", data);
      return NextResponse.json(
        { error: data.message || "Failed to subscribe" },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true, subscriber: data },
      { status: response.status }
    );
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
