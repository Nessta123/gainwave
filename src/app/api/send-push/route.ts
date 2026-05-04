import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const vapidPublicKey = 'BNH550PaBB7cNXNunTBdd1GkMC1yduzAWkfRNNxkA8rgWwANSSZvMEFeoM2f93GSDiAckA7-8-Vy3ndI93srfww';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// 🔥 POPRAVEK: Pravilen mailto naslov za tvojo domeno (preprečuje Chrome spam filter)
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:info@gain-wave.com', vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: Request) {
  try {
    if (!vapidPrivateKey) {
        console.error('❌ VAPID_PRIVATE_KEY manjka v .env datoteki!');
        return NextResponse.json({ error: 'VAPID missing' }, { status: 500 });
    }

    const { title, body, url, targetAlias, type, senderId } = await request.json();

    let recipients: { id: string, token: any }[] = [];

    // 1. SCENARIJ: Privatno sporočilo
    if (targetAlias) {
      const { data: profile } = await supabase.from('profiles').select('id, push_subscription').eq('alias', targetAlias).single();
      if (profile?.push_subscription) recipients.push({ id: profile.id, token: profile.push_subscription });
    } 
    // 2. SCENARIJ: Nova objava na Feedu ALI nov STORY
    else if ((type === 'feed_post' || type === 'story') && senderId) {
      const { data: follows } = await supabase.from('follows').select('follower_id').eq('following_id', senderId);
      if (follows && follows.length > 0) {
        const ids = follows.map(f => f.follower_id);
        const { data: profiles } = await supabase.from('profiles').select('id, push_subscription').in('id', ids);
        recipients = profiles?.filter(p => p.push_subscription).map(p => ({ id: p.id, token: p.push_subscription })) || [];
      }
    }
    // 3. SCENARIJ: Novo sporočilo v Hubu (Z MUTE LOGIKO)
    else if (type === 'hub_message' && senderId) {
      const { data: members } = await supabase
        .from('user_hub_memberships')
        .select('user_id, is_muted')
        .eq('hub_owner_id', senderId);
        
      if (members && members.length > 0) {
        const activeMemberIds = members
          .filter(m => m.is_muted !== true)
          .map(m => m.user_id);

        if (activeMemberIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, push_subscription')
            .in('id', activeMemberIds);
          recipients = profiles?.filter(p => p.push_subscription).map(p => ({ id: p.id, token: p.push_subscription })) || [];
        }
      }
    }

    // 🔥 ABSOLUTNI URL ZA VARNOST
    const baseUrl = 'https://www.gain-wave.com';
    let finalUrl = url || baseUrl;
    if (finalUrl.startsWith('/')) {
        finalUrl = baseUrl + finalUrl;
    } else if (!finalUrl.startsWith('http')) {
        finalUrl = baseUrl + '/' + finalUrl;
    }

    // IZVEDBA POŠILJANJA Z AVTOMATSKIM ČIŠČENJEM
    const results = await Promise.all(recipients.map(async (recipient) => {
      try {
        let cleanToken = recipient.token;
        if (typeof cleanToken === 'string') {
            cleanToken = JSON.parse(cleanToken);
            if (typeof cleanToken === 'string') {
                cleanToken = JSON.parse(cleanToken);
            }
        }
        
        // 🔥 AGRESIVNI PUSH PROTOKOL 🔥
        await webpush.sendNotification(cleanToken, JSON.stringify({
          title: title || 'Gain Wave Alpha',
          body: body || 'Nova transmisija!',
          url: finalUrl
        }), {
          // Nastavitve za prebijanje Battery Saver blokad:
          headers: {
            'Urgency': 'high' // Ključno za Android naprave s prazno baterijo
          },
          topic: type || 'general', // Združuje obvestila po tipu
          TTL: 3600 // Obvestilo ostane v oblaku 1 uro, če telefon nima signala
        });
        
        return { success: true };
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🧹 Čiščenje mrtvega tokena za uporabnika: ${recipient.id}`);
          await supabase.from('profiles').update({ push_subscription: null }).eq('id', recipient.id);
        }
        return { success: false, error: err.statusCode || err.message };
      }
    }));

    const successfulDeliveries = results.filter(r => r.success).length;

    return NextResponse.json({ 
      success: true, 
      sent_to: successfulDeliveries,
      cleaned: results.filter(r => !r.success && (r.error === 410 || r.error === 404)).length
    });

  } catch (error: any) {
    console.error('❌ Push Dispatcher Critical Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}