import { FlightOffer } from '@/types/flight';

export interface SavedSearch {
  id: string;
  savedAt: string;
  params: {
    origin: string;
    destinations: string[];
    departureDate: string;
    returnDate: string;
    adults: number;
    infants: number;
  };
  results: {
    destination: string;
    cheapestPrice: number | null;
    airline: string | null;
    flightCount: number;
  }[];
  note?: string;
}

const STORAGE_KEY = 'ticketscan_saved_searches';

export function getSavedSearches(): SavedSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSearch(search: Omit<SavedSearch, 'id' | 'savedAt'>): SavedSearch {
  const searches = getSavedSearches();
  const newSearch: SavedSearch = {
    ...search,
    id: `search-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    savedAt: new Date().toISOString(),
  };
  searches.unshift(newSearch);
  // 最大50件まで保存
  const trimmed = searches.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return newSearch;
}

export function deleteSearch(id: string): void {
  const searches = getSavedSearches();
  const filtered = searches.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function updateSearchNote(id: string, note: string): void {
  const searches = getSavedSearches();
  const index = searches.findIndex(s => s.id === id);
  if (index !== -1) {
    searches[index].note = note;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  }
}

export function formatSearchResults(
  destinations: string[],
  flightsByDestination: Map<string, FlightOffer[]>
): SavedSearch['results'] {
  return destinations.map(dest => {
    const flights = flightsByDestination.get(dest) || [];
    const sorted = [...flights].sort((a, b) => a.price.total - b.price.total);
    const cheapest = sorted[0];
    return {
      destination: dest,
      cheapestPrice: cheapest?.price.total || null,
      airline: cheapest?.airline || null,
      flightCount: flights.length,
    };
  });
}
