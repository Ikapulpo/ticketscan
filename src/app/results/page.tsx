'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import FlightCard from '@/components/FlightCard';
import { FlightOffer } from '@/types/flight';
import { allAirports } from '@/lib/airports';
import { saveSearch, formatSearchResults } from '@/lib/storage';

interface DestinationResult {
  destination: string;
  flights: FlightOffer[];
  isLoading: boolean;
  error: string | null;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'stops'>('price');
  const [selectedDestination, setSelectedDestination] = useState<string | 'all'>('all');
  const [isSaved, setIsSaved] = useState(false);

  const origin = searchParams.get('origin') || '';
  const destinationsParam = searchParams.get('destinations') || searchParams.get('destination') || '';
  const destinations = destinationsParam.split(',').filter(d => d.length === 3);
  const departureDate = searchParams.get('departureDate') || '';
  const returnDate = searchParams.get('returnDate') || '';
  const adults = parseInt(searchParams.get('adults') || '2');
  const infants = parseInt(searchParams.get('infants') || '1');

  const originAirport = allAirports.find(a => a.code === origin);

  useEffect(() => {
    if (!destinations.length || !departureDate || !returnDate) return;

    // 各目的地の初期状態を設定
    setResults(destinations.map(dest => ({
      destination: dest,
      flights: [],
      isLoading: true,
      error: null,
    })));

    // 各目的地を並行して検索
    destinations.forEach(async (destination, index) => {
      try {
        const params = new URLSearchParams({
          origin,
          destination,
          departureDate,
          returnDate,
          adults: adults.toString(),
          infants: infants.toString(),
        });

        const response = await fetch(`/api/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error('検索に失敗しました');
        }

        const data = await response.json();

        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = {
            destination,
            flights: data.offers || [],
            isLoading: false,
            error: null,
          };
          return newResults;
        });
      } catch (err) {
        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = {
            destination,
            flights: [],
            isLoading: false,
            error: err instanceof Error ? err.message : '検索中にエラーが発生しました',
          };
          return newResults;
        });
      }
    });
  }, [origin, destinationsParam, departureDate, returnDate, adults, infants]);

  // 全目的地の最安値を取得
  const cheapestByDestination = results.map(r => {
    const sorted = [...r.flights].sort((a, b) => a.price.total - b.price.total);
    return {
      destination: r.destination,
      cheapest: sorted[0] || null,
      isLoading: r.isLoading,
    };
  });

  // 表示するフライト
  const displayFlights = selectedDestination === 'all'
    ? results.flatMap(r => r.flights)
    : results.find(r => r.destination === selectedDestination)?.flights || [];

  // ソート処理
  const sortedFlights = [...displayFlights].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price.total - b.price.total;
      case 'stops':
        return a.stops - b.stops;
      case 'duration':
        return a.duration.localeCompare(b.duration);
      default:
        return 0;
    }
  });

  const isAllLoading = results.every(r => r.isLoading);
  const isAnyLoading = results.some(r => r.isLoading);

  const handleSave = () => {
    const flightsByDestination = new Map<string, FlightOffer[]>();
    results.forEach(r => {
      flightsByDestination.set(r.destination, r.flights);
    });

    saveSearch({
      params: {
        origin,
        destinations,
        departureDate,
        returnDate,
        adults,
        infants,
      },
      results: formatSearchResults(destinations, flightsByDestination),
    });
    setIsSaved(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-start">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              検索に戻る
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => router.push('/saved')}
                className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                保存した検索
              </button>
              {!isAllLoading && (
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`text-sm px-3 py-1 rounded-lg ${
                    isSaved
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSaved ? '保存済み' : 'この結果を保存'}
                </button>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800">
            {originAirport?.city || origin} 発
            {destinations.length === 1
              ? ` → ${allAirports.find(a => a.code === destinations[0])?.city || destinations[0]}`
              : ` / ${destinations.length}都市比較`
            }
          </h1>
          <p className="text-gray-600">
            {departureDate} 〜 {returnDate} / 大人{adults}人・乳児{infants}人
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAllLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">航空券を検索中...</p>
            <p className="text-sm text-gray-400 mt-2">
              {destinations.length > 1
                ? `${destinations.length}都市を同時検索しています`
                : 'サーバーサイドで検索を実行しています（キャッシュなし）'
              }
            </p>
          </div>
        ) : (
          <>
            {/* 複数目的地の場合: 比較サマリー */}
            {destinations.length > 1 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="font-bold text-lg text-gray-800 mb-4">目的地別 最安値比較</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {cheapestByDestination.map(({ destination, cheapest, isLoading }) => {
                    const destAirport = allAirports.find(a => a.code === destination);
                    return (
                      <button
                        key={destination}
                        onClick={() => setSelectedDestination(
                          selectedDestination === destination ? 'all' : destination
                        )}
                        className={`text-left rounded-lg p-4 transition-all ${
                          selectedDestination === destination
                            ? 'bg-blue-100 ring-2 ring-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <p className="font-medium text-gray-800">
                          {destAirport?.city || destination}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">{destination}</p>
                        {isLoading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                        ) : cheapest ? (
                          <>
                            <p className="text-xl font-bold text-blue-600">
                              ¥{cheapest.price.total.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">{cheapest.airline}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">結果なし</p>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedDestination !== 'all' && (
                  <button
                    onClick={() => setSelectedDestination('all')}
                    className="mt-4 text-blue-600 text-sm hover:underline"
                  >
                    全ての結果を表示
                  </button>
                )}
              </div>
            )}

            {/* 単一目的地の場合: ソース別最安値サマリー */}
            {destinations.length === 1 && sortedFlights.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="font-bold text-lg text-gray-800 mb-4">各サービスの最安値</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(
                    sortedFlights.reduce((acc, flight) => {
                      if (!acc[flight.source] || flight.price.total < acc[flight.source].price.total) {
                        acc[flight.source] = flight;
                      }
                      return acc;
                    }, {} as Record<string, FlightOffer>)
                  ).map(([source, flight]) => (
                    <div key={source} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 capitalize">{source}</p>
                      <p className="text-xl font-bold text-blue-600">
                        ¥{flight.price.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{flight.airline}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ソート・フィルター */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {sortedFlights.length}件の結果
                {isAnyLoading && <span className="ml-2 text-blue-600">(検索中...)</span>}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">並び替え:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'price' | 'duration' | 'stops')}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="price">価格が安い順</option>
                  <option value="stops">乗換が少ない順</option>
                  <option value="duration">所要時間が短い順</option>
                </select>
              </div>
            </div>

            {/* フライト一覧 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  adults={adults}
                  infants={infants}
                />
              ))}
            </div>

            {sortedFlights.length === 0 && !isAnyLoading && (
              <div className="text-center py-20">
                <p className="text-gray-600">該当するフライトが見つかりませんでした</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
