/**
 * DerbySystem — router.js
 * Parses the hash-based URL context used by /event/ and /admin/ pages.
 *
 * URL pattern:  /event/#/pack/152
 *               /admin/inspection/#/troop/47
 *
 * Usage:
 *   const ctx = getEventContext();
 *   // ctx → { org: "pack", name: "152" }  or null if URL is malformed
 */

function getEventContext() {
  // Strip leading "#/" then split
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [org, name] = parts;
  const valid = ["pack", "troop", "other"];
  if (!valid.includes(org) || !name) return null;
  return { org, name };
}

/**
 * Redirect to /event/#/{org}/{name}  from any admin sub-page.
 * Pass the current ctx to avoid re-parsing.
 */
function buildAdminUrl(page, ctx) {
  ctx = ctx || getEventContext();
  if (!ctx) return null;
  return `/DerbySystem/admin/${page}.html#/${ctx.org}/${ctx.name}`;
}

function buildEventUrl(ctx) {
  ctx = ctx || getEventContext();
  if (!ctx) return null;
  return `/DerbySystem/event/index.html#/${ctx.org}/${ctx.name}`;
}

/**
 * die(msg) — show a full-screen error and stop execution.
 * Used when the URL is missing or event not found.
 */
function die(msg) {
  document.body.innerHTML = `
    <div style="
      min-height:100vh; display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:16px;
      background:#f0f2f5; font-family:system-ui,sans-serif; padding:24px;">
      <div style="font-size:3rem;">🏁</div>
      <h2 style="margin:0; color:#111;">${msg}</h2>
      <p style="margin:0; color:#6b7280; text-align:center; max-width:340px;">
        Check the link you were given and try again, or contact your race organiser.
      </p>
      <a href="/" style="color:#2563eb; font-size:0.9rem;">← DerbySystem home</a>
    </div>`;
  throw new Error(msg);
}
