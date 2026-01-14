import { FlightOffer, SearchParams, FlightSegment } from '@/types/flight';
import { calculateFamilyPrice } from './priceCalculator';

// RapidAPI経由のGoogle Flights Scraper (Flights Scraper Data)
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'flights-scraper-data.p.rapidapi.com';

// APIレスポンスの型定義
interface FlightSegmentData {
  departureAirportCode: string;
  departureAirportName: string;
  arrivalAirportCode: string;
  arrivalAirportName: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  duration: number;
}

interface FlightData {
  airlineCode: string;
  airlineName: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  arrivalDate: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  price: number;
  segments: FlightSegmentData[];
}

interface ApiResponse {
  status: boolean;
  status_code: number;
  data: {
    topFlights?: FlightData[];
    otherFlights?: FlightData[];
  } | null;
  message?: string;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function convertSegments(segments: FlightSegmentData[]): FlightSegment[] {
  return segments.map((seg): FlightSegment => ({
    departure: {
      airport: seg.departureAirportCode,
      time: seg.departureTime,
    },
    arrival: {
      airport: seg.arrivalAirportCode,
      time: seg.arrivalTime,
    },
    airline: seg.airlineName,
    flightNumber: `${seg.airlineCode}${seg.flightNumber}`,
    duration: formatDuration(seg.duration),
  }));
}

export async function searchFlights(params: SearchParams): Promise<FlightOffer[]> {
  if (!RAPIDAPI_KEY) {
    console.log('[GoogleFlights] API key not configured');
    return [];
  }

  try {
    const headers = {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    };

    // 往路検索
    const outboundUrl = new URL(`https://${RAPIDAPI_HOST}/flights/search-oneway`);
    outboundUrl.searchParams.set('departureId', params.origin);
    outboundUrl.searchParams.set('arrivalId', params.destination);
    outboundUrl.searchParams.set('departureDate', params.departureDate);
    outboundUrl.searchParams.set('adults', params.adults.toString());
    if (params.infants > 0) {
      outboundUrl.searchParams.set('infants', params.infants.toString());
    }
    outboundUrl.searchParams.set('currency', 'JPY');

    console.log(`[GoogleFlights] Searching outbound: ${params.origin} -> ${params.destination}`);

    const outboundResponse = await fetch(outboundUrl.toString(), { headers });

    if (!outboundResponse.ok) {
      console.error('[GoogleFlights] Outbound API error:', outboundResponse.status);
      return [];
    }

    const outboundData: ApiResponse = await outboundResponse.json();

    if (!outboundData.status || !outboundData.data) {
      console.log('[GoogleFlights] Outbound: No results or error -', outboundData.message);
      return [];
    }

    // 往路の結果を取得
    const outboundFlights = [
      ...(outboundData.data.topFlights || []),
      ...(outboundData.data.otherFlights || []),
    ];

    console.log(`[GoogleFlights] Outbound: ${outboundFlights.length} flights found`);

    // 復路検索
    const returnUrl = new URL(`https://${RAPIDAPI_HOST}/flights/search-oneway`);
    returnUrl.searchParams.set('departureId', params.destination);
    returnUrl.searchParams.set('arrivalId', params.origin);
    returnUrl.searchParams.set('departureDate', params.returnDate);
    returnUrl.searchParams.set('adults', params.adults.toString());
    if (params.infants > 0) {
      returnUrl.searchParams.set('infants', params.infants.toString());
    }
    returnUrl.searchParams.set('currency', 'JPY');

    console.log(`[GoogleFlights] Searching return: ${params.destination} -> ${params.origin}`);

    const returnResponse = await fetch(returnUrl.toString(), { headers });
    let returnFlights: FlightData[] = [];

    if (returnResponse.ok) {
      const returnData: ApiResponse = await returnResponse.json();
      if (returnData.status && returnData.data) {
        returnFlights = [
          ...(returnData.data.topFlights || []),
          ...(returnData.data.otherFlights || []),
        ];
        console.log(`[GoogleFlights] Return: ${returnFlights.length} flights found`);
      }
    }

    // 往路と復路を組み合わせてオファーを作成
    const offers: FlightOffer[] = [];

    for (let i = 0; i < Math.min(outboundFlights.length, 10); i++) {
      const outbound = outboundFlights[i];
      // 復路がある場合は対応するフライトを選択、なければ往路のみ
      const inbound = returnFlights[i % Math.max(returnFlights.length, 1)] || null;

      // 往路の価格 + 復路の価格
      const outboundPrice = outbound.price || 0;
      const inboundPrice = inbound?.price || outboundPrice;
      const totalAdultPrice = outboundPrice + inboundPrice;

      const priceBreakdown = calculateFamilyPrice(
        totalAdultPrice,
        params.adults,
        params.infants,
        'JPY',
        outbound.airlineCode
      );

      offers.push({
        id: `googleflights-${i}-${Date.now()}`,
        source: 'googleflights',
        price: {
          adult: Math.round(totalAdultPrice),
          infant: priceBreakdown.infantPrice,
          total: priceBreakdown.grandTotal,
          currency: 'JPY',
        },
        outbound: convertSegments(outbound.segments || []),
        inbound: inbound ? convertSegments(inbound.segments || []) : [],
        airline: outbound.airlineName,
        stops: outbound.stops,
        duration: formatDuration(outbound.durationMinutes),
        bookingUrl: undefined,
      });
    }

    console.log(`[GoogleFlights] Total offers created: ${offers.length}`);
    return offers;
  } catch (error) {
    console.error('[GoogleFlights] Search error:', error);
    return [];
  }
}
