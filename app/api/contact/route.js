export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactMail } from "../../../lib/mail";

const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  message: z.string().min(5).max(5000),
  website: z.string().optional().nullable(),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = ContactSchema.parse({
      ...body,
      phone: body.phone || null,
      company: body.company || null,
      website: body.website || null,
    });

    if (parsed.website) return NextResponse.json({ ok: true }); // honeypot
    await sendContactMail(parsed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || "Form gönderilemedi." }, { status: 400 });
  }
}
