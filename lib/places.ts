export type PlaceInfo = { name: string; address: string; types: string[] };

export function placesEnabled(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

/** Google Places Text Search (New): what kind of place is this merchant? */
export async function lookupPlace(merchant: string, city: string): Promise<PlaceInfo | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.types,places.primaryType",
      },
      body: JSON.stringify({
        textQuery: [merchant, city, "Costa Rica"].filter(Boolean).join(", "),
        languageCode: "es",
        regionCode: "CR",
        pageSize: 1,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: { displayName?: { text?: string }; formattedAddress?: string; types?: string[]; primaryType?: string }[];
    };
    const place = data.places?.[0];
    if (!place) return null;
    const types = [place.primaryType, ...(place.types ?? [])].filter((t): t is string => Boolean(t));
    return { name: place.displayName?.text ?? merchant, address: place.formattedAddress ?? "", types };
  } catch {
    return null;
  }
}
