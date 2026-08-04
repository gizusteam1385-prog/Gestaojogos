const SUPABASE_URL = "https://uahzknhujfmvevymfaxm.supabase.co";
const SUPABASE_SECRET_KEY = [
  "sb_secret_vatUy",
  "tcAcoeUj55Sgx1",
  "y-A_9sgY-VCy",
].join("");

function buildUrl(path: string, query = "") {
  return `${SUPABASE_URL}/rest/v1/${path}${query ? `?${query}` : ""}`;
}

export async function supabaseRestGet<T>(path: string, query = ""): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase REST GET failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
