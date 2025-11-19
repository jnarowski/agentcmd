import { NextRequest, NextResponse } from "next/server";

const KIT_API_KEY = "mBblmIEKoIqENqcfxeCo0Q";
const KIT_API_URL = "https://api.kit.com/v4/subscribers";

export async function POST(request: NextRequest) {
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
        "X-Kit-Api-Key": KIT_API_KEY,
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
