import { NextResponse } from "next/server";
import { isValidWebhookUrl, getAuthUser } from "@/lib/authMiddleware";

// In-memory webhook registry (in production, use database)
let webhooks = [];

export async function GET() {
    return NextResponse.json(webhooks);
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.url || !body.events) {
            return NextResponse.json({ error: "url và events[] bắt buộc" }, { status: 400 });
        }

        // Validate URL to prevent SSRF
        if (!isValidWebhookUrl(body.url)) {
            return NextResponse.json({ error: "URL webhook phải dùng HTTPS và không được trỏ tới private IP" }, { status: 400 });
        }

        if (!Array.isArray(body.events) || body.events.length === 0) {
            return NextResponse.json({ error: "events phải là mảng không rỗng" }, { status: 400 });
        }

        const webhook = {
            id: crypto.randomUUID(),
            url: body.url,
            events: body.events,
            active: true,
            created_at: new Date().toISOString(),
        };

        webhooks.push(webhook);
        return NextResponse.json(webhook, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        webhooks = webhooks.filter(w => w.id !== id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Helper: dispatch event to all matching webhooks
export async function dispatchWebhook(event, payload) {
    const matching = webhooks.filter(w => w.active && w.events.includes(event));
    for (const wh of matching) {
        try {
            // Double-check URL before dispatching
            if (!isValidWebhookUrl(wh.url)) continue;
            await fetch(wh.url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Webhook-Event": event },
                body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
            });
        } catch (err) {
            console.error(`Webhook ${wh.id} failed:`, err.message);
        }
    }
}
