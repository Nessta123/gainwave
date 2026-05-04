import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const prompt = body.prompt;
    const assetType = body.assetType || 'game-asset';
    const userId = body.userId || `user-${Date.now()}`;
    const selectedGenre = body.selectedGenre || 'running'; 

    if (!prompt) {
      return NextResponse.json({ error: "Manjka prompt za generiranje!" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
        throw new Error("Kritična napaka: OpenAI API ključ manjka na strežniku!");
    }

    console.log(`🧹 [ZERO-BLOAT] Čistim stare datoteke za: ${userId}-${assetType}`);
    
    // 🔥 AVTOMATSKO BRISANJE STARE SLIKE IZ STORAGE-A
    const { data: existingFiles } = await supabase.storage
        .from('game-assets')
        .list('public', {
            search: `${userId}-${assetType}-`
        });

    if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `public/${f.name}`);
        await supabase.storage.from('game-assets').remove(filesToDelete);
    }

    console.log(`🎨 [DALL-E 3] Generiram ${assetType} za ${selectedGenre}...`);
    
    // 1. PAMETNI PROMPT INŽENIRING (Strogo za hrbet!)
    let systemPrompt = prompt;
    if (assetType === 'character') {
      const baseStyle = "3D Pixar-style cartoon game character, vibrant colors, clean edges, isolated on solid white background, full body, NO text, NO sprite sheets.";
      
      if (selectedGenre === 'running') {
        // 🔥 EKSTREMNI UKAZI ZA POGLED OD ZADAJ 🔥
        systemPrompt = `${baseStyle} STERN BACK VIEW. The character ${prompt} is facing AWAY from the camera, looking forward into the distance. Show ONLY the back of the head, back of the hoodie, and the back of the body. ABSOLUTELY NO FACE, NO EYES, NO MOUTH, NO NOSE. 100% rear perspective.`;
      } else {
        // Pogled od spredaj za ostale igre
        systemPrompt = `${baseStyle} Facing forward, front view of ${prompt}, centered and symmetrical.`;
      }
    } else if (assetType === 'obstacle') {
      systemPrompt = `Isolated 2D game obstacle of ${prompt}. Full object visible, solid white background, flat vector style, no text.`;
    } else if (assetType === 'item') {
      systemPrompt = `Isolated 2D game item icon of ${prompt}. Glowing, solid white background, detailed icon, centered, no text.`;
    } else if (assetType === 'background') {
      systemPrompt = `A high-quality 2D video game background environment, theme: ${prompt}. Wide shot, panoramic, digital art, no characters, high resolution.`;
    }

    // 2. KLIC OPENAI API (DALL-E 3)
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "dall-e-3",
            prompt: systemPrompt,
            n: 1,
            size: "1024x1024",
            quality: "hd"
        })
    });

    const openaiData = await openaiRes.json();
    if (!openaiRes.ok) throw new Error(openaiData.error?.message || "DALL-E generation failed");

    const rawImageUrl = openaiData.data[0].url;
    let finalBuffer: Buffer;

    // 3. STABILITY AI ZA IZREZ OZADJA
    if (assetType !== 'background' && process.env.STABILITY_API_KEY) {
        console.log(`✂️ [STABILITY AI] Odstranjujem ozadje...`);
        const imageFetchRes = await fetch(rawImageUrl);
        const imageBlob = await imageFetchRes.blob();
        const formData = new FormData();
        formData.append('image', imageBlob);
        const bgRes = await fetch('https://api.stability.ai/v2beta/stable-image/edit/remove-background', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`, 'Accept': 'image/*' },
            body: formData
        });
        finalBuffer = bgRes.ok ? Buffer.from(await bgRes.arrayBuffer()) : Buffer.from(await imageBlob.arrayBuffer());
    } else {
        const imageFetchRes = await fetch(rawImageUrl);
        finalBuffer = Buffer.from(await imageFetchRes.arrayBuffer());
    }

    // 4. SHRANJEVANJE V SUPABASE
    const fileName = `${userId}-${assetType}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from('game-assets').upload(`public/${fileName}`, finalBuffer, { contentType: 'image/png' });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('game-assets').getPublicUrl(`public/${fileName}`);

    // 🔥 POSODOBITEV BAZE
    await supabase.from('user_game_assets').delete().match({ user_id: userId, asset_type: assetType });
    await supabase.from('user_game_assets').insert({ user_id: userId, asset_type: assetType, image_url: publicUrlData.publicUrl });

    console.log(`✅ [USPEH] DALL-E 3 skovan! URL: ${publicUrlData.publicUrl}`);
    return NextResponse.json({ success: true, imageUrl: publicUrlData.publicUrl });

  } catch (err: any) {
    console.error("🔥 Asset Processor Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
