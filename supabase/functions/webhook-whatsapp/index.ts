// Webhook handler for Meta WhatsApp Cloud API
// Target Table: whatsapp_webhooks
// The VPS Node.js bot listens to the whatsapp_webhooks table via Realtime.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
    // 1. WhatsApp API Webhook Verification (GET Request)
    if (req.method === "GET") {
        const url = new URL(req.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === "beres_api_123") {
            console.log("WEBHOOK_VERIFIED");
            return new Response(challenge, { status: 200 });
        } else {
            return new Response("Verification failed", { status: 403 });
        }
    }

    // 2. We accept POST requests for incoming WhatsApp messages
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();

        // 3. WhatsApp messages usually have body.entry
        if (!body.entry) {
            return new Response("Not a WhatsApp message", { status: 200 });
        }

        const changes = body.entry?.[0]?.changes?.[0]?.value;
        const messages = changes?.messages;

        // Return 200 immediately to acknowledge receipt to Meta
        if (!messages || messages.length === 0) {
            return new Response("OK", { status: 200 });
        }

        // Insert into database to be processed by VPS bot listener
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase.from('whatsapp_webhooks').insert({
            payload: body
        });

        if (error) {
            console.error("Failed to insert into whatsapp_webhooks:", error);
        }

        return new Response("OK", { status: 200 });
    } catch (err) {
        console.error("Error processing webhook:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
