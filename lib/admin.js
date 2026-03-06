/**
 * DerbySystem — admin.js
 * Shared helpers for all admin pages.
 * Included after api.js and router.js.
 *
 * Provides:
 *   adminBoot()  — init page, check PIN, return { sb, ctx, event, eventId }
 *   pinKey(eventId) — localStorage key for this event's PIN
 *   buildAdminNav(ctx, activePage) — render the top nav links
 *   toast(msg, ok) — show toast notification
 */

function pinKey(eventId) {
  return `derby_admin_pin_${eventId}`;
}

/**
 * Show the PIN gate overlay and resolve when correct PIN entered.
 * adminPin comes from the event row.
 */
function _showPinGate(adminPin, eventId) {
  return new Promise((resolve) => {
    const gate = document.getElementById("pinGate");
    if (gate) gate.style.display = "flex";

    const input = document.getElementById("pinInput");
    const errEl = document.getElementById("pinErr");
    if (!input) { resolve(); return; } // no gate on page

    input.focus();
    input.addEventListener("input", function handler() {
      if (this.value.length === 4) {
        if (this.value === adminPin) {
          localStorage.setItem(pinKey(eventId), adminPin);
          if (gate) gate.style.display = "none";
          input.removeEventListener("input", handler);
          resolve();
        } else {
          if (errEl) errEl.textContent = "Wrong PIN";
          this.value = "";
        }
      }
    });
  });
}

/**
 * Boot an admin page:
 * 1. initPage() to resolve event
 * 2. Check PIN (localStorage cache or request input)
 * Returns { sb, ctx, event, eventId }
 */
async function adminBoot() {
  let result;
  try { result = await initPage(); }
  catch (e) { throw e; }

  const { event, eventId } = result;
  const adminPin = event.admin_pin || "2468";
  const cached   = localStorage.getItem(pinKey(eventId));

  const gate = document.getElementById("pinGate");
  if (cached === adminPin) {
    if (gate) gate.style.display = "none";
  } else {
    await _showPinGate(adminPin, eventId);
  }

  return result;
}

/**
 * Build the admin top nav given the current context and active page.
 * Returns an HTML string — inject into a .top-nav element.
 */
function buildAdminNav(ctx, activePage) {
  const base = `/DerbySystem/admin`;
  const hash = `#/${ctx.org}/${ctx.name}`;
  const pages = [
    { id: "index",      label: "Hub",       href: `${base}/index${hash}` },
    { id: "inspection", label: "Inspection",href: `${base}/inspection${hash}` },
    { id: "track",      label: "Track",     href: `${base}/track${hash}` },
    { id: "results",    label: "Officials", href: `${base}/results${hash}` },
    { id: "cars",       label: "Cars",      href: `${base}/cars${hash}` },
    { id: "announcer",  label: "Screen",    href: `${base}/announcer${hash}` },
  ];
  return pages.map(p =>
    `<a href="${p.href}"${p.id === activePage ? ' class="active"' : ""}>${p.label}</a>`
  ).join("");
}

function toast(msg, ok = true) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = ok ? "show ok" : "show err";
  setTimeout(() => el.className = "", 3000);
}
