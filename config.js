// Placeholder only. Do not put a real key in this file.
// GitHub Pages overwrites this file at deploy time. The root site
// https://jrhospitality.github.io/hotelhq/ gets mode "live" and the
// SUPABASE_PUBLISHABLE_KEY repository secret. That secret is publishable
// only, and the workflow fails if it is missing. The same build is copied
// to /hotelhq/demo/ with mode "demo" and an empty key. It is not stored in git.
window.HOTELHQ_CONFIG = {
  supabaseUrl: "https://clxvmtbmveusrbxacnxe.supabase.co",
  supabaseKey: "",
  mode: "demo"
};
