// @ts-ignore
import webpush from "npm:web-push@3.6.7";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const message = body.record || body;

    // @ts-ignore
    webpush.setVapidDetails(
      'mailto:admin@gainwave.pro',
      Deno.env.get('VAPID_PUBLIC_KEY') || '',
      Deno.env.get('VAPID_PRIVATE_KEY') || ''
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    let recipients: string[] = [];

    // Iskanje žetonov za kanale ali privatna sporočila
    if (message.channel_id) {
      const { data: members } = await supabase
        .from('channel_members')
        .select('profiles(push_token)')
        .eq('channel_id', message.channel_id);

      if (members) {
        recipients = members.map((m: any) => m.profiles?.push_token).filter((t: any) => !!t);
      }
    } else if (message.to_alias) {
      const { data: profile } = await supabase.from('profiles').select('push_token').eq('alias', message.to_alias).single();
      if (profile?.push_token) recipients.push(profile.push_token);
    }

    const notificationPromises = recipients.map(async (token: string) => {
      try {
        const pushSubscription = JSON.parse(token);
        const payload = JSON.stringify({
          title: message.channel_id ? `Node: #${message.channel_name || 'GW'}` : `Direct Node: ${message.from_alias || 'GW'}`,
          body: message.text || "New message",
          // 🔥 TUKAJ JE POPRAVEK ZA DEEP LINKING (Dodan gw=true)
          url: message.channel_id 
               ? `/?gw=true&channel=${message.channel_id}${message.topic_id ? `&topic=${message.topic_id}` : ''}` 
               : `/?gw=true&user=${message.from_alias || ''}`,
          tag: message.channel_id ? `chan-${message.channel_id}` : `msg-${message.from_alias}`
        });
        // @ts-ignore
        return await webpush.sendNotification(pushSubscription, payload);
      } catch (err) { console.error("Push error:", err); }
    });

    await Promise.all(notificationPromises);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});