import { supabase } from '@/lib/supabaseClient';

// 1. HELPER: Funkcija za dejansko pošiljanje obvestila na telefon
const sendPush = async (targetAlias: string, title: string, body: string, url: string = '/') => {
  try {
    console.log(`🛰️ Sending Push to: ${targetAlias} | Title: ${title}`);
    
    // 🔥 PAMETNI URL FIX: Relativna pot za brskalnik, polna domena za Sodnika (server)
    let targetUrl = '/api/send-push';
    if (typeof window === 'undefined') {
      targetUrl = `https://gain-wave.com${targetUrl}`;
    }
    
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url, targetAlias }),
    });

    // 👻 DUHEC SE VRAČA V KONZOLO
    console.log(`👻 Ninja Sync: Obvestilo uspesno poslano za ${targetAlias}`);
  } catch (err) {
    console.error("❌ Push failed:", err);
  }
};

// 2. HELPER: Funkcija za pridobivanje sledilcev (V 2 korakih, da se izognemo PGRST200 napaki)
const getFollowers = async (userId: any) => {
  // Korak 1: Dobimo samo ID-je sledilcev
  const { data: follows, error: followErr } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);
  
  if (followErr) {
    console.error("❌ Error fetching follower IDs:", followErr);
    return [];
  }
  if (!follows || follows.length === 0) return [];

  const followerIds = follows.map((f: any) => f.follower_id);

  // Korak 2: Dobimo aliase za te ID-je
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, alias')
    .in('id', followerIds);

  if (profErr || !profiles) {
    console.error("❌ Error fetching follower profiles:", profErr);
    return [];
  }

  // Sestavimo nazaj v format, ki ga pričakuje najina glavna funkcija
  return follows.map((f: any) => {
    const prof = profiles.find((p: any) => p.id === f.follower_id);
    return {
      follower_id: f.follower_id,
      profiles: prof ? { alias: prof.alias } : null
    };
  });
};

// 3. GLAVNA FUNKCIJA (Dispatcher)
export const dispatchNotification = async (payload: any) => {
    // 🔥 DODAN 'title' V PAYLOAD ZA SODNIKA 🔥
    const { type, senderId, senderAlias, receiverId, channelId, channelName, topicId, topicName, content, title } = payload;
    console.log("🚀 DISPATCHER TRIGGERED:", type, "from", senderAlias);

    // A) Logika za Privatna Sporočila (DM)
    if (type === 'direct_message') {
        const { data: receiverInfo } = await supabase.from('profiles').select('alias').eq('id', receiverId).single();
        if (receiverInfo?.alias) {
            return sendPush(receiverInfo.alias, `✉️ Novo sporočilo od ${senderAlias}`, content, `/?user=${senderAlias}`);
        }
    }

    // B) Logika za Skupnost, Story in Feed
    try {
        switch (type) {
            case 'channel_message':
                // Korak 1: Dobimo člane kanala (Brez relacij, samo osnovni podatki)
                const { data: members, error: memErr } = await supabase
                    .from('channel_members')
                    .select('user_id, is_muted')
                    .eq('channel_id', channelId);

                if (memErr) {
                    console.error("❌ Error fetching channel members:", memErr);
                    break;
                }
                if (!members || members.length === 0) break;

                // Korak 2: Dobimo profile članov za aliase
                const memberIds = members.map((m: any) => m.user_id);
                const { data: memberProfs } = await supabase
                    .from('profiles')
                    .select('id, alias')
                    .in('id', memberIds);

                if (!memberProfs) break;

                // Korak 3: Obvestimo vse člane
                members.forEach((member: any) => {
                    const prof = memberProfs.find((p: any) => p.id === member.user_id);
                    const targetAlias = prof?.alias;
                    const isMuted = member.is_muted;

                    if (targetAlias && targetAlias !== senderAlias && !isMuted) {
                        const shortContent = content && content.length > 50 ? content.substring(0, 50) + '...' : content;
                        sendPush(
                            targetAlias,
                            `💬 Node: #${channelName}`,
                            `${senderAlias} in #${topicName}: ${shortContent}`,
                            `/?channel=${channelId}&topic=${topicId}`
                        );
                    }
                });
                break;
                
            case 'new_post':
                const followersList = await getFollowers(senderId);
                console.log(`📢 Notifying ${followersList.length} followers of new post.`);
                followersList.forEach((f: any) => {
                    if (f.profiles?.alias) {
                        sendPush(f.profiles.alias, "📢 Nova objava!", `${senderAlias} je pravkar objavil nekaj novega.`, `/?user=${senderAlias}`);
                    }
                });
                break;

            case 'master_signal':
                const { data: allUsers } = await supabase.from('profiles').select('alias');
                allUsers?.forEach((u: any) => {
                     sendPush(u.alias, "🔱 NOVI SIGNAL", content, "/");
                });
                break;

            case 'new_story': // Usklajeno s tipom v StoryBar.tsx
                const storyFollowers = await getFollowers(senderId);
                console.log(`📸 Notifying ${storyFollowers.length} followers of new story.`);
                storyFollowers.forEach((f: any) => {
                    if (f.profiles?.alias) {
                        sendPush(f.profiles.alias, "📸 Novi Story!", `${senderAlias} je dodal nov story.`, `/?user=${senderAlias}`);
                    }
                });
                break;

            // 🔥 NOVO: Klic AI Sodnika 🔥
            case 'system_judge_alert':
                const alertFollowers = await getFollowers(senderId);
                console.log(`📢 Notifying ${alertFollowers.length} followers of SYSTEM JUDGE ALERT.`);
                alertFollowers.forEach((f: any) => {
                    if (f.profiles?.alias) {
                        // Pošljemo push s title in content, ki ga določi Sodnik. 
                        // Klik jih vrže na profil trejderja, ki je izdal signal.
                        sendPush(f.profiles.alias, title, content, `/?user=${senderAlias}`);
                    }
                });
                break;
        }
    } catch (error) {
        console.error("🔥 Dispatcher Crash:", error);
    }
};
