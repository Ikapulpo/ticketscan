import { NextRequest, NextResponse } from 'next/server';
import { FlightOffer, SearchParams } from '@/types/flight';
import { calculateFamilyPrice } from '@/lib/priceCalculator';
import { searchFlights as searchAmadeus } from '@/lib/amadeus';
import { searchFlights as searchSkyscanner } from '@/lib/skyscanner';
import { searchFlights as searchGoogleFlights } from '@/lib/googleFlights';

// ランダムなUser-Agentを生成（キャッシュ対策）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// モックデータを生成（APIが設定されていない場合のフォールバック）
function generateMockFlights(params: SearchParams): FlightOffer[] {
  const airlines = [
    { code: 'JAL', name: '日本航空' },
    { code: 'ANA', name: '全日空' },
    { code: 'SQ', name: 'シンガポール航空' },
    { code: 'CX', name: 'キャセイパシフィック' },
    { code: 'TG', name: 'タイ国際航空' },
  ];

  const sources: ('skyscanner' | 'amadeus' | 'kiwi')[] = ['skyscanner', 'amadeus', 'kiwi'];

  // 基準価格（目的地によって変動）
  const basePrices: Record<string, number> = {
    'ICN': 35000,
    'TPE': 40000,
    'HKG': 45000,
    'BKK': 50000,
    'SIN': 55000,
    'HNL': 80000,
    'LAX': 100000,
    'LHR': 120000,
    'CDG': 115000,
    'default': 60000,
  };

  const basePrice = basePrices[params.destination] || basePrices['default'];

  return airlines.flatMap((airline, airlineIndex) =>
    sources.map((source, sourceIndex): FlightOffer => {
      // 各ソースで微妙に異なる価格を設定（比較のため）
      const priceVariation = (Math.random() * 0.2 - 0.1) * basePrice;
      const adultPrice = Math.round(basePrice + priceVariation + (sourceIndex * 2000));

      const priceBreakdown = calculateFamilyPrice(
        adultPrice,
        params.adults,
        params.infants,
        'JPY',
        airline.code
      );

      return {
        id: `${airline.code}-${source}-${airlineIndex}-${sourceIndex}`,
        source,
        price: {
          adult: priceBreakdown.adultPrice,
          infant: priceBreakdown.infantPrice,
          total: priceBreakdown.grandTotal,
          currency: 'JPY',
        },
        outbound: [
          {
            departure: {
              airport: params.origin,
              time: '10:00',
            },
            arrival: {
              airport: params.destination,
              time: '14:00',
            },
            airline: airline.name,
            flightNumber: `${airline.code}${100 + airlineIndex}`,
            duration: '4h 00m',
          },
        ],
        inbound: [
          {
            departure: {
              airport: params.destination,
              time: '15:00',
            },
            arrival: {
              airport: params.origin,
              time: '21:00',
            },
            airline: airline.name,
            flightNumber: `${airline.code}${200 + airlineIndex}`,
            duration: '4h 00m',
          },
        ],
        airline: airline.name,
        stops: Math.random() > 0.7 ? 1 : 0,
        duration: '4h 00m',
        bookingUrl: `https://example.com/book/${airline.code}`,
      };
    })
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: SearchParams = {
    origin: searchParams.get('origin') || 'NRT',
    destination: searchParams.get('destination') || '',
    departureDate: searchParams.get('departureDate') || '',
    returnDate: searchParams.get('returnDate') || '',
    adults: parseInt(searchParams.get('adults') || '2'),
    infants: parseInt(searchParams.get('infants') || '1'),
  };

  // バリデーション
  if (!params.destination || !params.departureDate || !params.returnDate) {
    return NextResponse.json(
      { error: '必須パラメータが不足しています' },
      { status: 400 }
    );
  }

  // サーバーサイドでの検索（クライアントのCookieを使わない）
  const userAgent = getRandomUserAgent();
  console.log(`[Search API] Using User-Agent: ${userAgent}`);
  console.log(`[Search API] Searching: ${params.origin} -> ${params.destination}`);

  try {
    // 複数のAPIから並行して検索
    const [amadeusResults, skyscannerResults, googleFlightsResults] = await Promise.allSettled([
      searchAmadeus(params),
      searchSkyscanner(params),
      searchGoogleFlights(params),
    ]);

    let flights: FlightOffer[] = [];

    // 成功した結果を統合
    if (amadeusResults.status === 'fulfilled') {
      flights = flights.concat(amadeusResults.value);
      console.log(`[Search API] Amadeus: ${amadeusResults.value.length} results`);
    } else {
      console.log('[Search API] Amadeus failed:', amadeusResults.reason);
    }

    if (skyscannerResults.status === 'fulfilled') {
      flights = flights.concat(skyscannerResults.value);
      console.log(`[Search API] Skyscanner: ${skyscannerResults.value.length} results`);
    } else {
      console.log('[Search API] Skyscanner failed:', skyscannerResults.reason);
    }

    if (googleFlightsResults.status === 'fulfilled') {
      flights = flights.concat(googleFlightsResults.value);
      console.log(`[Search API] Google Flights: ${googleFlightsResults.value.length} results`);
    } else {
      console.log('[Search API] Google Flights failed:', googleFlightsResults.reason);
    }

    // APIからの結果がない場合はモックデータを使用
    if (flights.length === 0) {
      console.log('[Search API] No API results, using mock data');
      flights = generateMockFlights(params);
    }

    // 価格順でソート
    flights.sort((a, b) => a.price.total - b.price.total);

    return NextResponse.json({
      offers: flights,
      searchedAt: new Date().toISOString(),
      params,
      sources: {
        amadeus: amadeusResults.status === 'fulfilled' && amadeusResults.value.length > 0,
        skyscanner: skyscannerResults.status === 'fulfilled' && skyscannerResults.value.length > 0,
        googleflights: googleFlightsResults.status === 'fulfilled' && googleFlightsResults.value.length > 0,
        mock: flights.some(f => f.id.includes('JAL-') || f.id.includes('ANA-')),
      },
    });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: '検索中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
