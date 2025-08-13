export async function sendContactMail(data) {
    const FROM = process.env.CONTACT_FROM_EMAIL;
    const TO = process.env.CONTACT_TO_EMAIL;
    if (!FROM || !TO) throw new Error("CONTACT_FROM_EMAIL / CONTACT_TO_EMAIL eksik.");
  
    // Resend varsa onu kullan
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: FROM,
        to: TO,
        subject: `Yeni Bilgi Al formu — ${data.company || "Bilinmiyor"}`,
        html: renderHtml(data),
      });
      return;
    }
  
    // Yoksa SMTP (nodemailer)
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || "false") === "true";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) throw new Error("SMTP env değerleri eksik.");
  
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  
    await transporter.sendMail({
      from: FROM,
      to: TO,
      subject: `Yeni Bilgi Al formu — ${data.company || "Bilinmiyor"}`,
      html: renderHtml(data),
    });
  }
  
  function renderHtml(d) {
    return `
    <div style="font-family:ui-sans-serif,system-ui;line-height:1.6">
      <h2>Yeni Bilgi Al Formu</h2>
      <p><b>Ad Soyad:</b> ${esc(d.name)}</p>
      <p><b>E-posta:</b> ${esc(d.email)}</p>
      <p><b>Telefon:</b> ${esc(d.phone || "-")}</p>
      <p><b>Şirket:</b> ${esc(d.company || "-")}</p>
      <p><b>Mesaj:</b><br/>${esc(d.message).replace(/\n/g,"<br/>")}</p>
      <hr/>
      <small>Kaynak: insaatai.com</small>
    </div>`;
  }
  function esc(s) {
    return (s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  }
  