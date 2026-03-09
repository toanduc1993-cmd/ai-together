import { NextResponse } from "next/server";

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

        const webhook = {
            id: crypto.randomUUID(),
            url: body.url,
            events: body.events, // e.g., ["project.created", "deliverable.submitted"]
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
