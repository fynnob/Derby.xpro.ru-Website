/**
 * DerbySystem — auth.js
 * Scoutmaster authentication helpers using Supabase magic links.
 * Import on any page that needs to know the current user.
 */

/** Get the current session (null if not signed in) */
async function getSession() {
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

/** Require sign-in; redirect to auth.html if not */
async function requireSession() {
  const session = await getSession();
  if (!session) {
    location.href = `/auth.html?next=${encodeURIComponent(location.href)}`;
    throw new Error("unauthenticated");
  }
  return session;
}

/**
 * Send a magic-link email.
 * Returns { error } — null error means email was sent.
 */
async function sendMagicLink(email) {
  const redirectTo = `${location.origin}/dashboard/`;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  return { error };
}

/** Sign out and go to home */
async function signOut() {
  await sb.auth.signOut();
  location.href = "/";
}

/** Return the scoutmaster's orgs list */
async function getMyOrgs(session) {
  const { data, error } = await sb
    .from("orgs")
    .select("*")
    .eq("owner_id", session.user.id)
    .order("created_at");
  return { data: data ?? [], error };
}

/** Return all events for an org */
async function getOrgEvents(orgId) {
  const { data, error } = await sb
    .from("events")
    .select("*")
    .eq("org_id", orgId)
    .order("event_date", { ascending: false });
  return { data: data ?? [], error };
}
