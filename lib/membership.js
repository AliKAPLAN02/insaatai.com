// lib/membership.js
import { sbBrowser } from "@/lib/supabaseBrowserClient";

const isUUIDv4 = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test((v || "").trim());

export async function processInviteMembership(supabase) {
  const _sb = supabase || sbBrowser();

  const { data: { user }, error } = await _sb.auth.getUser();
  if (error || !user) throw new Error(error?.message || "Kullanıcı yok");

  const meta = user.user_metadata || {};
  const rawCompanyId = meta.company_id || meta.inviteCode || meta.companyId || "";
  const companyId = String(rawCompanyId).trim();

  if (!companyId) return { done: false, reason: "no-meta" };

  // (Opsiyonel) UUID guard: yanlış formatta ise RPC'yi zorlamadan çık
  if (!isUUIDv4(companyId)) {
    try { await _sb.auth.updateUser({ data: { company_id: null, inviteCode: null, companyId: null } }); } catch {}
    return { done: false, reason: "invalid-company-id" };
  }

  // Zaten kayıtlı mı? (RLS nedeniyle boş dönebilir; hata olsa da RPC'ye devam edeceğiz)
  const { data: exist, error: selErr } = await _sb
    .from("company_member")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .limit(1);

  if (selErr) {
    console.warn("[processInviteMembership] select warning:", selErr.message);
  } else if (exist && exist.length) {
    try { await _sb.auth.updateUser({ data: { company_id: null, inviteCode: null, companyId: null } }); } catch {}
    return { done: true, reason: "already-member" };
  }

  // Önerilen yol: RPC ile idempotent ekleme
  const { error: rpcErr } = await _sb.rpc("add_employee_to_company", {
    p_company_id: companyId,
    p_role: "calisan",
  });
  if (rpcErr) throw new Error("RPC add_employee_to_company: " + rpcErr.message);

  // Tek seferlik metadata temizliği
  try { await _sb.auth.updateUser({ data: { company_id: null, inviteCode: null, companyId: null } }); } catch {}

  return { done: true, reason: "joined" };
}

export default processInviteMembership;
