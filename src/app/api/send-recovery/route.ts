import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// 🔥 KONFIGURACIJA SISTEMA 🔥
const SUPABASE_URL = "https://knfnxxldjpvlemffhdnu.supabase.co";
const SUPABASE_SERVICE_KEY = "sb_secret_p-mMtjd08Ac0T1l3Y6BRww_V0trWcKN";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. KORAK: Poiščemo PRAVI mail v tvoji tabeli `profiles`
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, alias, email')
      .ilike('email', email.trim()) 
      .maybeSingle();

    if (profileError || !profile) {
      console.log("❌ Email not found in public.profiles:", email);
      return NextResponse.json({ error: "User with this recovery email not found in our records." }, { status: 404 });
    }

    // 2. KORAK: Dobimo skriti Auth Email iz Supabase trezorja (npr. alias@terminal.com)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

    if (authError || !authData.user || !authData.user.email) {
      console.error("❌ Auth User or Email not found for ID:", profile.id);
      return NextResponse.json({ error: "Critical Auth mismatch." }, { status: 500 });
    }

    const systemAuthEmail = authData.user.email; 
    console.log("✅ Found match! Translating", email, "->", systemAuthEmail);

    // 3. KORAK: Zgeneriramo Magic Link za sistem
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: systemAuthEmail!, // 🔥 DODAN KLICAJ (!), DA TS NE JAVLJA NAPAKE
      options: {
        redirectTo: 'https://www.gain-wave.com/reset-password'
      }
    });

    if (error) {
      console.error("Supabase Admin Link Error:", error.message);
      throw error;
    }

    const magicLink = data.properties.action_link;

    // 4. KORAK: Pošljemo ta link na njegov PRAVI mail (Hostinger)
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false, 
      auth: {
        user: "info@gain-wave.com", 
        pass: "2051991.Gw", 
      },
    });

    const mailOptions = {
      from: '"GainWave Terminal" <info@gain-wave.com>',
      to: profile.email, 
      subject: "GainWave - Reset Security Key",
      html: `
        <div style="background-color:#050509;color:#fff;padding:30px;font-family:sans-serif;border:1px solid #3b82f6;border-radius:20px;max-width:500px;margin:0 auto;text-align:center;">
          <h2 style="color:#3b82f6;margin-top:0;text-transform:uppercase;letter-spacing:3px;">GainWave Protocol</h2>
          <div style="height:1px;background-color:#1e293b;margin:20px 0;"></div>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">Commander <strong>@${profile.alias}</strong>, a request was made to override your Security Key.</p>
          <p style="color:#a1a1aa;font-size:14px;margin-bottom:30px;">Click the secure injection link below to proceed:</p>
          <a href="${magicLink}" style="display:inline-block;padding:16px 30px;background-color:#3b82f6;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;box-shadow:0 10px 20px rgba(59,130,246,0.3);">Initialize Recovery</a>
          <p style="color:#52525b;font-size:11px;margin-top:40px;font-style:italic;">This link is valid for 24 hours. If you did not request this, no action is needed. System integrity is secured.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Recovery email successfully forced through Hostinger SMTP for:", profile.email);

    return NextResponse.json({ success: true, message: "Email sent securely." });
  } catch (error: any) {
    console.error("🔥 Hardcore API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
