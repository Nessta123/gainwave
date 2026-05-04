import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase Admin povezava
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, gameConfig } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Manjka User ID" }, { status: 400 });
    }

    console.log(`🚀 [COMPILER] Zaganjam pakiranje igre za uporabnika: ${userId}`);

    // 1. POIŠČI VSE SLIKE V SUPABASE ZA TEGA UPORABNIKA
    const { data: files, error: listError } = await supabase.storage
      .from('game-assets')
      .list('public', {
        search: `${userId}-`
      });

    if (listError) throw listError;
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "V Supabase ni najdenih nobenih assetov za to igro." }, { status: 404 });
    }

    // 2. PRIPRAVI LOKALNO MAPO NA HETZNER STREŽNIKU
    // Pot bo: /var/www/gainwave/public/games/{userId}/
    const localDir = path.join(process.cwd(), 'public', 'games', userId);
    
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const filesToDelete: string[] = [];
    const localUrls: Record<string, string> = {};

    // 3. PRENOS SLIK IZ SUPABASE NA LOKALNI DISK
    for (const file of files) {
      // Preskočimo skrite datoteke, kot je .emptyFolderPlaceholder
      if (file.name.startsWith('.')) continue;

      const filePath = `public/${file.name}`;
      console.log(`⬇️ Prenašam: ${file.name}`);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('game-assets')
        .download(filePath);

      if (downloadError) {
        console.error(`Napaka pri prenosu ${file.name}:`, downloadError);
        continue;
      }

      // Zapišemo datoteko na tvoj strežnik
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const localFilePath = path.join(localDir, file.name);
      fs.writeFileSync(localFilePath, buffer);

      // Shranimo pot za kasnejšo uporabo v igri (dostopno preko https://tvoja-domena.com/games/...)
      const assetType = file.name.split('-')[1]; // izlušči "character", "background"...
      localUrls[assetType] = `/games/${userId}/${file.name}`;

      // Pripravimo na brisanje iz Supabase
      filesToDelete.push(filePath);
    }

    // 4. THE PURGE: IZBRIŠI IZ SUPABASE IN SPROSTI PROSTOR
    if (filesToDelete.length > 0) {
      console.log(`🧹 [PURGE] Brišem ${filesToDelete.length} datotek iz Supabase Bucketa...`);
      const { error: deleteError } = await supabase.storage
        .from('game-assets')
        .remove(filesToDelete);

      if (deleteError) {
        console.error("⚠️ Opozorilo: Napaka pri brisanju iz Supabase:", deleteError);
      } else {
        console.log("✅ [PURGE] Supabase je očiščen in prazen!");
      }
    }

    // 5. ZAPIŠI GAME CONFIG NA STREŽNIK (Opcijsko: shraniva ekonomijo igre)
    const configPath = path.join(localDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(gameConfig, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: "Igra uspešno prevedena in shranjena na glavni strežnik.",
      assets: localUrls
    });

  } catch (err: any) {
    console.error("🔥 Compiler Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
