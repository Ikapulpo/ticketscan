import { FlightOffer, SearchParams, FlightSegment } from '@/types/flight';
import { calculateFamilyPrice } from './priceCalculator';

// RapidAPI経由のGoogle Flights Scraper
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'flights-scraper-data.p.rapidapi.com';

interface GoogleFlightSegment {
  departure_airport: {
    id: string;
    name: string;
    time: string;
  };
  arrival_airport: {
    id: string;
    name: string;
    time: string;
  };
  duration: number;
  flight_number: string;
  airline: string;
  airline_logo: string;
  travel_class: string;
  legroom: string;
  extensions: string[];
}

interface GoogleFlightResult {
  flights: GoogleFlightSegment[][];
  total_duration: number;
  price: number;
  type: string;
  airline_logo: string;
  departure_token?: string;
  extensions?: string[];
  layovers?: Array<{
    duration: number;
    name: string;
    id: string;
  }>;
}

interface GoogleFlightsResponse {
  status: boolean;
  data: {
    best_flights?: GoogleFlightResult[];
    other_flights?: GoogleFlightResult[];
  };
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(isoTime: string): string {
  // 2024-01-15 10:30 or 2024-01-15T10:30:00
  const date = new Date(isoTime);
  if (isNaN(date.getTime())) {
    // フォールバック: 時間部分だけ抽出
    const match = isoTime.match(/(\d{1,2}:\d{2})/);
    return match ? match[1] : isoTime;
  }
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function convertSegments(segments: GoogleFlightSegment[]): FlightSegment[] {
  return segments.map((seg): FlightSegment => ({
    departure: {
      airport: seg.departure_airport.id,
      time: formatTime(seg.departure_airport.time),
    },
    arrival: {
      airport: seg.arrival_airport.id,
      time: formatTime(seg.arrival_airport.time),
    },
    airline: seg.airline,
    flightNumber: seg.flight_number,
    duration: formatDuration(seg.duration),
  }));
}

export async function searchFlights(params: SearchParams): Promise<FlightOffer[]> {
  if (!RAPIDAPI_KEY) {
    console.log('[GoogleFlights] API key not configured');
    return [];
  }

  try {
    // 往路検索
    const outboundUrl = new URL(`https://${RAPIDAPI_HOST}/flights/search-one-way`);
    outboundUrl.searchParams.set('origin', params.origin);
    outboundUrl.searchParams.set('destination', params.destination);
    outboundUrl.searchParams.set('date', params.departureDate);
    outboundUrl.searchParams.set('adults', params.adults.toString());
    outboundUrl.searchParams.set('children', '0');
    outboundUrl.searchParams.set('infants_in_seat', '0');
    outboundUrl.searchParams.set('infants_on_lap', params.infants.toString());
    outboundUrl.searchParams.set('currency', 'JPY');

    const headers = {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    };

    console.log(`[GoogleFlights] Searching: ${params.origin} -> ${params.destination}`);

    const outboundResponse = await fetch(outboundUrl.toString(), { headers });

    if (!outboundResponse.ok) {
      console.error('[GoogleFlights] API error:', outboundResponse.status);
      return [];
    }

    const outboundData: GoogleFlightsResponse = await outboundResponse.json();

    if (!outboundData.status || !outboundData.data) {
      console.log('[GoogleFlights] No results');
      return [];
    }

    // 往路の結果を取得
    const allFlights = [
      ...(outboundData.data.best_flights || []),
      ...(outboundData.data.other_flights || []),
    ];

    // 復路検索
    const returnUrl = new URL(`https://${RAPIDAPI_HOST}/flights/search-one-way`);
    returnUrl.searchParams.set('origin', params.destination);
    returnUrl.searchParams.set('destination', params.origin);
    returnUrl.searchParams.set('date', params.returnDate);
    returnUrl.searchParams.set('adults', params.adults.toString());
    returnUrl.searchParams.set('children', '0');
    returnUrl.searchParams.set('infants_in_seat', '0');
    returnUrl.searchParams.set('infants_on_lap', params.infants.toString());
    returnUrl.searchParams.set('currency', 'JPY');

    const returnResponse = await fetch(returnUrl.toString(), { headers });
    let returnFlights: GoogleFlightResult[] = [];

    if (returnResponse.ok) {
      const returnData: GoogleFlightsResponse = await returnResponse.json();
      if (returnData.status && returnData.data) {
        returnFlights = [
          ...(returnData.data.best_flights || []),
          ...(returnData.data.other_flights || []),
        ];
      }
    }

    // 往路と復路を組み合わせてオファーを作成
    const offers: FlightOffer[] = [];

    for (let i = 0; i < Math.min(allFlights.length, 15); i++) {
      const outbound = allFlights[i];
      const inbound = returnFlights[i % returnFlights.length] || returnFlights[0];

      if (!outbound) continue;

      // 往路の価格 + 復路の価格（ある場合）
      const outboundPrice = outbound.price || 0;
      const inboundPrice = inbound?.price || outboundPrice;
      const totalAdultPrice = outboundPrice + inboundPrice;

      const priceBreakdown = calculateFamilyPrice(
        totalAdultPrice,
        params.adults,
        params.infants,
        'JPY'
      );

      const outboundSegments = outbound.flights?.[0] || [];
      const inboundSegments = inbound?.flights?.[0] || [];

      const airline = outboundSegments[0]?.airline || 'Unknown';

      offers.push({
        id: `googleflights-${i}-${Date.now()}`,
        source: 'googleflights',
        price: {
          adult: Math.round(totalAdultPrice),
          infant: priceBreakdown.infantPrice,
          total: priceBreakdown.grandTotal,
          currency: 'JPY',
        },
        outbound: convertSegments(outboundSegments),
        inbound: convertSegments(inboundSegments),
        airline,
        stops: Math.max(0, outboundSegments.length - 1),
        duration: formatDuration(outbound.total_duration || 0),
        bookingUrl: undefined, // Google Flightsは直接予約URLを提供しない
      });
    }

    console.log(`[GoogleFlights] Found ${offers.length} offers`);
    return offers;
  } catch (error) {
    console.error('[GoogleFlights] Search error:', error);
    return [];
  }
}
