// app/api/CONTACT_ROUTE/route.js  (kendi klasöründe)
// Node tabanlı mail kitaplıkları için:
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactMail } from "../../mail/mail"; // mevcut yapına göre doğruysa bırak

const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  message: z.string().min(5).max(5000),
  website: z.string().optional().nullable(), // honeypot
});

export async function POST(req) {
  // JSON parse hatasına karşı koruma
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  // Validasyon (throw etmeyen sürüm)
  const parsed = ContactSchema.safeParse({
    ...body,
    phone: body?.phone || null,
    company: body?.company || null,
    website: body?.website || null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validasyon hatası", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Honeypot: bot ise sessizce OK
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  // Mail gönderimi
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
