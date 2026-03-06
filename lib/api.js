/**
 * DerbySystem — api.js
 * Thin wrapper around the Supabase JS client.
 * Loads SUPABASE_URL + SUPABASE_ANON_KEY from window.DS_CONFIG
 * which is injected by config.js (written by setup tooling or env).
 *
 * Every page that needs data does:
 *   <script src="/DerbySystem/lib/api.js"></script>
 *   const { sb, eventId } = await initPage();
 *
 * initPage() resolves the org_type/org_name from location.hash,
 * fetches the matching event row, and returns:
 *   { sb, ctx, event, eventId }
 */

// DS_CONFIG is set in config.js which is gitignored.
// Fallback to env vars injected at build time for GitHub Pages.
const _cfg = window.DS_CONFIG || {};
const SUPABASE_URL      = _cfg.url      || "";
const SUPABASE_ANON_KEY = _cfg.anon_key || "";

// The real Supabase JS client is loaded via CDN on each page before this file.
function _createSb() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("DerbySystem: DS_CONFIG not set — check config.js");
  }
  return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

/** Shared Supabase client — one instance per page load */
const sb = _createSb();

/**
 * initPage(requireAuth)
 * - Parses URL context (org/name)
 * - Fetches event row from Supabase
 * - If requireAuth=true, redirects to /auth.html if not signed in
 * Returns: { sb, ctx, event, eventId }
 */
async function initPage({ requireAuth = false } = {}) {
  if (requireAuth) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const next = encodeURIComponent(location.href);
      location.href = `/DerbySystem/auth?next=${next}`;
      throw new Error("redirecting to auth");
    }
  }

  const ctx = getEventContext();   // from router.js
  if (!ctx) die("No event found in URL");

  // Resolve org → event
  const { data: orgRow, error: orgErr } = await sb
    .from("orgs")
    .select("id")
    .eq("org_type", ctx.org)
    .eq("org_name", ctx.name)
    .maybeSingle();

  if (orgErr || !orgRow) die("Organisation not found — " + ctx.org + "/" + ctx.name);

  const { data: event, error: evErr } = await sb
    .from("events")
    .select("*")
    .eq("org_id", orgRow.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (evErr || !event) die("No active event found for this organisation");

  return { sb, ctx, event, eventId: event.id };
}

/**
 * Subscribe to any table change scoped to this event.
 * cb receives the Supabase realtime payload.
 * Returns the channel (call .unsubscribe() on cleanup).
 */
function subscribeTable(eventId, table, cb) {
  return sb
    .channel(`${table}:${eventId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table,
      filter: `event_id=eq.${eventId}`,
    }, cb)
    .subscribe();
}

/**
 * Convert a device UUID token to a short human-readable code.
 * Used on parent QR sheets and at the inspection kiosk.
 * 4 uppercase letters (no I or O to avoid confusion), ~280k combinations.
 * Deterministic — same token always produces same code.
 */
function tokenToShortCode(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash) + token.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[hash % chars.length];
    hash = Math.floor(hash / chars.length);
  }
  return code;
}
