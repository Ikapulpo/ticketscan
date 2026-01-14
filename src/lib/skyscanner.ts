import { FlightOffer, SearchParams, FlightSegment } from '@/types/flight';
import { calculateFamilyPrice } from './priceCalculator';

// RapidAPI経由のSkyscanner API
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'skyscanner-api.p.rapidapi.com';

interface SkyscannerLeg {
  origin: { id: string; name: string };
  destination: { id: string; name: string };
  departure: string;
  arrival: string;
  durationInMinutes: number;
  stopCount: number;
  carriers: { marketing: Array<{ id: number; name: string; logoUrl: string }> };
  segments: Array<{
    origin: { displayCode: string };
    destination: { displayCode: string };
    departure: string;
    arrival: string;
    durationInMinutes: number;
    flightNumber: string;
    marketingCarrier: { name: string; alternateId: string };
  }>;
}

interface SkyscannerItinerary {
  id: string;
  price: { raw: number; formatted: string };
  legs: SkyscannerLeg[];
  deeplink: string;
}

interface SkyscannerResponse {
  data: {
    itineraries: SkyscannerItinerary[];
  };
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(isoTime: string): string {
  const date = new Date(isoTime);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function convertLegToSegments(leg: SkyscannerLeg): FlightSegment[] {
  return leg.segments.map((seg): FlightSegment => ({
    departure: {
      airport: seg.origin.displayCode,
      time: formatTime(seg.departure),
    },
    arrival: {
      airport: seg.destination.displayCode,
      time: formatTime(seg.arrival),
    },
    airline: seg.marketingCarrier.name,
    flightNumber: seg.flightNumber,
    duration: formatDuration(seg.durationInMinutes),
  }));
}

export async function searchFlights(params: SearchParams): Promise<FlightOffer[]> {
  if (!RAPIDAPI_KEY) {
    console.log('[Skyscanner] API key not configured');
    return [];
  }

  try {
    // Skyscanner APIはセッション形式
    // まず検索セッションを作成
    const createUrl = `https://${RAPIDAPI_HOST}/v3/flights/live/search/create`;

    const query = {
      market: 'JP',
      locale: 'ja-JP',
      currency: 'JPY',
      queryLegs: [
        {
          originPlaceId: { iata: params.origin },
          destinationPlaceId: { iata: params.destination },
          date: {
            year: parseInt(params.departureDate.split('-')[0]),
            month: parseInt(params.departureDate.split('-')[1]),
            day: parseInt(params.departureDate.split('-')[2]),
          },
        },
        {
          originPlaceId: { iata: params.destination },
          destinationPlaceId: { iata: params.origin },
          date: {
            year: parseInt(params.returnDate.split('-')[0]),
            month: parseInt(params.returnDate.split('-')[1]),
            day: parseInt(params.returnDate.split('-')[2]),
          },
        },
      ],
      adults: params.adults,
      infants: params.infants,
      cabinClass: 'CABIN_CLASS_ECONOMY',
    };

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error('[Skyscanner] API error:', response.status);
      return [];
    }

    const data: SkyscannerResponse = await response.json();
    const itineraries = data.data?.itineraries || [];

    return itineraries.slice(0, 20).map((itinerary): FlightOffer => {
      const adultPrice = itinerary.price.raw;
      const outboundLeg = itinerary.legs[0];
      const inboundLeg = itinerary.legs[1];

      const priceBreakdown = calculateFamilyPrice(
        adultPrice,
        params.adults,
        params.infants,
        'JPY'
      );

      return {
        id: `skyscanner-${itinerary.id}`,
        source: 'skyscanner',
        price: {
          adult: Math.round(adultPrice),
          infant: priceBreakdown.infantPrice,
          total: priceBreakdown.grandTotal,
          currency: 'JPY',
        },
        outbound: outboundLeg ? convertLegToSegments(outboundLeg) : [],
        inbound: inboundLeg ? convertLegToSegments(inboundLeg) : [],
        airline: outboundLeg?.carriers.marketing[0]?.name || 'Unknown',
        stops: outboundLeg?.stopCount || 0,
        duration: outboundLeg ? formatDuration(outboundLeg.durationInMinutes) : '0h 0m',
        bookingUrl: itinerary.deeplink,
      };
    });
  } catch (error) {
    console.error('[Skyscanner] Search error:', error);
    return [];
  }
}
