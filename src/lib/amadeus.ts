import Amadeus from 'amadeus';
import { FlightOffer, SearchParams, FlightSegment } from '@/types/flight';
import { calculateFamilyPrice } from './priceCalculator';

// Amadeus APIクライアント（遅延初期化）
let amadeusClient: Amadeus | null = null;

function getAmadeusClient(): Amadeus | null {
  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    return null;
  }
  if (!amadeusClient) {
    amadeusClient = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    });
  }
  return amadeusClient;
}

interface AmadeusSegment {
  departure: {
    iataCode: string;
    at: string;
  };
  arrival: {
    iataCode: string;
    at: string;
  };
  carrierCode: string;
  number: string;
  duration: string;
}

interface AmadeusItinerary {
  duration: string;
  segments: AmadeusSegment[];
}

interface AmadeusOffer {
  id: string;
  itineraries: AmadeusItinerary[];
  price: {
    currency: string;
    total: string;
    base: string;
    grandTotal: string;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
  }>;
}

function formatDuration(isoDuration: string): string {
  // PT4H30M -> 4h 30m
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours = match[1] || '0';
  const minutes = match[2] || '0';
  return `${hours}h ${minutes}m`;
}

function formatTime(isoTime: string): string {
  // 2024-01-15T10:30:00 -> 10:30
  const date = new Date(isoTime);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function convertSegment(segment: AmadeusSegment): FlightSegment {
  return {
    departure: {
      airport: segment.departure.iataCode,
      time: formatTime(segment.departure.at),
    },
    arrival: {
      airport: segment.arrival.iataCode,
      time: formatTime(segment.arrival.at),
    },
    airline: segment.carrierCode,
    flightNumber: `${segment.carrierCode}${segment.number}`,
    duration: formatDuration(segment.duration),
  };
}

export async function searchFlights(params: SearchParams): Promise<FlightOffer[]> {
  const amadeus = getAmadeusClient();

  // APIキーが設定されていない場合は空配列を返す
  if (!amadeus) {
    console.log('[Amadeus] API credentials not configured');
    return [];
  }

  try {
    // 大人の旅行者リクエストを作成
    const travelers = [];
    for (let i = 0; i < params.adults; i++) {
      travelers.push({
        id: (i + 1).toString(),
        travelerType: 'ADULT',
      });
    }
    for (let i = 0; i < params.infants; i++) {
      travelers.push({
        id: (params.adults + i + 1).toString(),
        travelerType: 'HELD_INFANT',
        associatedAdultId: (i + 1).toString(), // 乳児は大人に紐付け
      });
    }

    const response = await amadeus.shopping.flightOffersSearch.post(
      JSON.stringify({
        currencyCode: 'JPY',
        originDestinations: [
          {
            id: '1',
            originLocationCode: params.origin,
            destinationLocationCode: params.destination,
            departureDateTimeRange: {
              date: params.departureDate,
            },
          },
          {
            id: '2',
            originLocationCode: params.destination,
            destinationLocationCode: params.origin,
            departureDateTimeRange: {
              date: params.returnDate,
            },
          },
        ],
        travelers,
        sources: ['GDS'],
        searchCriteria: {
          maxFlightOffers: 20,
        },
      })
    );

    const offers = (response.data || []) as AmadeusOffer[];

    return offers.map((offer): FlightOffer => {
      // 大人料金を取得
      const adultPricing = offer.travelerPricings.find(
        (tp) => tp.travelerType === 'ADULT'
      );
      const infantPricing = offer.travelerPricings.find(
        (tp) => tp.travelerType === 'HELD_INFANT'
      );

      const adultPrice = adultPricing ? parseFloat(adultPricing.price.total) : 0;
      const infantPrice = infantPricing ? parseFloat(infantPricing.price.total) : 0;

      const priceBreakdown = calculateFamilyPrice(
        adultPrice,
        params.adults,
        params.infants,
        offer.price.currency,
        offer.validatingAirlineCodes[0]
      );

      // 実際の乳児料金がある場合はそれを使用
      const actualInfantTotal = infantPrice * params.infants;
      const actualTotal = adultPrice * params.adults + actualInfantTotal;

      const outbound = offer.itineraries[0]?.segments.map(convertSegment) || [];
      const inbound = offer.itineraries[1]?.segments.map(convertSegment) || [];

      return {
        id: `amadeus-${offer.id}`,
        source: 'amadeus',
        price: {
          adult: Math.round(adultPrice),
          infant: infantPrice > 0 ? Math.round(infantPrice) : priceBreakdown.infantPrice,
          total: Math.round(actualTotal > 0 ? actualTotal : priceBreakdown.grandTotal),
          currency: offer.price.currency,
        },
        outbound,
        inbound,
        airline: offer.validatingAirlineCodes[0] || 'Unknown',
        stops: outbound.length - 1,
        duration: formatDuration(offer.itineraries[0]?.duration || 'PT0H'),
        bookingUrl: undefined, // Amadeusは直接予約URLを提供しない
      };
    });
  } catch (error) {
    console.error('[Amadeus] Search error:', error);
    return [];
  }
}
