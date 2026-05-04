import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const text = formData.get('text') as string;
    const userId = formData.get('userId') as string;
    const image = formData.get('image') as File | null;

    let publicImageUrl = null;

    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      
      // 🔥 FACEBOOK LOGIKA: Max 1920px, 80% kvaliteta, avtomatska rotacija
      const processedBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      const fileName = `${userId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('community-posts')
        .upload(fileName, processedBuffer, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('community-posts').getPublicUrl(fileName);
      publicImageUrl = urlData.publicUrl;
    }

    // 💾 SHRANJEVANJE V TABELO 'community_messages'
    const { data: postData, error: postError } = await supabase
      .from('community_messages')
      .insert({
        user_id: userId,
        message: text,      // Predvidevam, da se stolpec za tekst imenuje 'message'
        image_url: publicImageUrl,
        created_at: new Date().toISOString()
      })
      .select().single();

    if (postError) throw postError;
    return NextResponse.json({ success: true, post: postData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
