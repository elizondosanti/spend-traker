import { normalizeKey } from "./text";

export type Group = "bills" | "needs" | "wants" | "income";
export const GROUPS: Group[] = ["bills", "needs", "wants", "income"];

type Seed = {
  slug: string;
  es: string;
  en: string;
  grp: Group;
  budget: number;
  keywords: string[];
  placeTypes: string[];
};

export const SEED_CATEGORIES: Seed[] = [
  { slug: "rent", es: "Alquiler", en: "Rent", grp: "bills", budget: 250000, keywords: ["alquiler", "renta", "condominio"], placeTypes: [] },
  {
    slug: "utilities", es: "Servicios", en: "Utilities", grp: "bills", budget: 60000,
    keywords: ["municipalidad", "ice ", "kolbi", "aya", "cnfl", "jasec", "liberty", "claro", "tigo", "telecable", "cabletica", "electricidad", "agua", "internet"],
    placeTypes: ["local_government_office", "city_hall", "electric_utility"],
  },
  {
    slug: "subscriptions", es: "Suscripciones", en: "Subscriptions", grp: "bills", budget: 15000,
    keywords: ["netflix", "spotify", "disney", "hbo", "max.com", "apple.com", "icloud", "youtube", "prime video", "google one", "chatgpt", "openai"],
    placeTypes: [],
  },
  {
    slug: "groceries", es: "Supermercado", en: "Groceries", grp: "needs", budget: 120000,
    keywords: ["auto mercado", "automercado", "walmart", "masxmenos", "mas x menos", "pricesmart", "pali", "megasuper", "fresh market", "perimercados", "supermercado", "super ", "alimentacion", "comida", "verduleria", "carniceria"],
    placeTypes: ["supermarket", "grocery_store", "food_store", "butcher_shop"],
  },
  {
    slug: "transport", es: "Transporte", en: "Transport", grp: "needs", budget: 40000,
    keywords: ["parquimetro", "parqueo", "parking", "uber", "didi", "peaje", "taxi", "autobus", "bus ", "transporte", "quick pass", "quickpass"],
    placeTypes: ["parking", "transit_station", "bus_station", "taxi_stand", "car_rental"],
  },
  {
    slug: "fuel", es: "Combustible", en: "Fuel", grp: "needs", budget: 50000,
    keywords: ["delta", "gasolinera", "servicentro", "puma", "estacion de servicio", "gas station", "combustible"],
    placeTypes: ["gas_station"],
  },
  {
    slug: "health", es: "Salud", en: "Health", grp: "needs", budget: 30000,
    keywords: ["farmacia", "fischel", "la bomba", "sucre", "hospital", "clinica", "laboratorio", "dental", "medico", "optica"],
    placeTypes: ["pharmacy", "drugstore", "hospital", "doctor", "dentist", "medical_lab"],
  },
  { slug: "other", es: "Otros", en: "Other", grp: "needs", budget: 20000, keywords: [], placeTypes: [] },
  {
    slug: "restaurants", es: "Restaurantes", en: "Restaurants", grp: "wants", budget: 60000,
    keywords: ["dunkin", "starbucks", "mcdonald", "kfc", "pizza", "restaurante", "soda ", "cafe", "coffee", "bar ", "burger", "subway", "taco", "sushi", "rosti", "pollo", "panaderia", "heladeria", "uber eats", "rappi"],
    placeTypes: ["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "meal_delivery", "coffee_shop", "fast_food_restaurant", "ice_cream_shop", "food"],
  },
  {
    slug: "fun", es: "Entretenimiento", en: "Entertainment", grp: "wants", budget: 30000,
    keywords: ["cine", "cinepolis", "ccm", "teatro", "steam", "playstation", "xbox", "nintendo", "concierto", "boleteria"],
    placeTypes: ["movie_theater", "amusement_park", "night_club", "tourist_attraction", "museum", "zoo"],
  },
  {
    slug: "shopping", es: "Compras", en: "Shopping", grp: "wants", budget: 40000,
    keywords: ["amazon", "tienda", "zara", "h&m", "universal", "ekono", "pequeno mundo", "epa", "colono", "mall", "ropa"],
    placeTypes: ["store", "clothing_store", "shopping_mall", "department_store", "electronics_store", "hardware_store", "book_store"],
  },
  { slug: "income", es: "Ingresos", en: "Income", grp: "income", budget: 0, keywords: ["salario", "planilla", "pago", "horas", "honorarios", "trabajo"], placeTypes: [] },
];

const BY_SLUG = new Map(SEED_CATEGORIES.map((s) => [s.slug, s]));

export function seedFor(slug: string | null | undefined): Seed | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A keyword matches at the start of a word; a trailing space in the keyword means "whole word". */
const KEYWORD_PATTERNS = SEED_CATEGORIES.map((seed) => ({
  slug: seed.slug,
  patterns: seed.keywords.map(
    (k) => new RegExp(`(^| )${escape(normalizeKey(k))}${k.endsWith(" ") ? "( |$)" : ""}`),
  ),
}));

/** Keyword match against the merchant or the transfer concept. Returns a seed slug. */
export function matchKeywords(text: string): string | null {
  const key = normalizeKey(text);
  return KEYWORD_PATTERNS.find((c) => c.patterns.some((p) => p.test(key)))?.slug ?? null;
}

export function matchPlaceTypes(types: string[]): string | null {
  for (const seed of SEED_CATEGORIES) {
    if (types.some((t) => seed.placeTypes.includes(t))) return seed.slug;
  }
  return null;
}
