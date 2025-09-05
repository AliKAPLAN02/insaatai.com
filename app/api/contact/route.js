// app/api/contact/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // cache disable
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactMail } from "../../mail/mail"; // path doğruysa bırak

// --- Validasyon şeması
const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  message: z.string().min(5).max(5000),
  website: z.string().optional().nullable(), // honeypot
});

export async function POST(req) {
  let body;

  // 1) JSON parse
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Geçersiz JSON formatı" },
      { status: 400 }
    );
  }

  // 2) Validasyon
  const parsed = ContactSchema.safeParse({
    ...body,
    phone: body?.phone || null,
    company: body?.company || null,
    website: body?.website || null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validasyon hatası",
        issues: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  // 3) Honeypot (bot kontrolü)
  if (parsed.data.website) {
    return NextResponse.json({ ok: true }); // sessizce başarılı dön
  }

  // 4) Mail gönderimi
  try {
    await sendContactMail(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "E-posta gönderilemedi." },
      { status: 500 }
    );
  }
}
