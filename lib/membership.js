// lib/membership.js
import { sbBrowser } from "@/lib/supabaseBrowserClient";

export async function processInviteMembership(supabase) {
  const _sb = supabase || sbBrowser();

  const { data: { user }, error } = await _sb.auth.getUser();
  if (error || !user) throw new Error(error?.message || "Kullanıcı yok");

  const meta = user.user_metadata || {};
  const companyId = String(meta.company_id || meta.inviteCode || meta.companyId || "").trim();
  if (!companyId) return { done: false, reason: "no-meta" };

  // Zaten kayıtlı mı?
  const { data: exist, error: selErr } = await _sb
    .from("company_member")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .limit(1);

  if (selErr) throw new Error("Check membership: " + selErr.message);

  if (exist && exist.length) {
    // Tek seferlik metadata temizliği
    await _sb.auth.updateUser({ data: { company_id: null, inviteCode: null } });
    return { done: true, reason: "already-member" };
  }

  // Önerilen yol: RPC ile idempotent ekleme
  const { error: rpcErr } = await _sb.rpc("add_employee_to_company", {
    p_company_id: companyId,
    p_role: "calisan",
  });
  if (rpcErr) throw new Error("RPC add_employee_to_company: " + rpcErr.message);

  // Tek seferlik metadata temizliği
  await _sb.auth.updateUser({ data: { company_id: null, inviteCode: null } });

  return { done: true, reason: "joined" };
}

export default processInviteMembership;
