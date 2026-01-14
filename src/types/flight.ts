export interface Airport {
  code: string;
  name: string;
  city: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  infants: number;
}

export interface FlightSegment {
  departure: {
    airport: string;
    time: string;
  };
  arrival: {
    airport: string;
    time: string;
  };
  airline: string;
  flightNumber: string;
  duration: string;
}

export interface FlightOffer {
  id: string;
  source: 'skyscanner' | 'amadeus' | 'kiwi';
  price: {
    adult: number;
    infant: number;
    total: number;
    currency: string;
  };
  outbound: FlightSegment[];
  inbound: FlightSegment[];
  airline: string;
  stops: number;
  duration: string;
  bookingUrl?: string;
}

export interface SearchResult {
  offers: FlightOffer[];
  searchedAt: string;
}
