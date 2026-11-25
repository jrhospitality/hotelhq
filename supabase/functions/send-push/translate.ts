// DeepL helper. No-ops (returns null) when DEEPL_API_KEY is not set.
export type Lang = "en" | "es";
export async function translate(text: string): Promise<{ src: Lang; en: string; es: string } | null> {
  const key = Deno.env.get("DEEPL_API_KEY");
  if (!key || !text?.trim()) return null;
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const call = async (target: string) => {
    const r = await fetch(`${host}/v2/translate`, {
      method: "POST",
      headers: { "Authorization": `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: [text], target_lang: target }),
    });
    if (!r.ok) throw new Error(`deepl ${r.status}`);
    return (await r.json()).translations[0];
  };
  const toEs = await call("ES");
  const src: Lang = String(toEs.detected_source_language).toUpperCase() === "ES" ? "es" : "en";
  if (src === "es") { const toEn = await call("EN-US"); return { src, es: text, en: toEn.text }; }
  return { src, en: text, es: toEs.text };
}
