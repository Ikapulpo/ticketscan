'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import FlightCard from '@/components/FlightCard';
import { FlightOffer } from '@/types/flight';
import { allAirports } from '@/lib/airports';

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'stops'>('price');

  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const departureDate = searchParams.get('departureDate') || '';
  const returnDate = searchParams.get('returnDate') || '';
  const adults = parseInt(searchParams.get('adults') || '2');
  const infants = parseInt(searchParams.get('infants') || '1');

  const originAirport = allAirports.find(a => a.code === origin);
  const destinationAirport = allAirports.find(a => a.code === destination);

  useEffect(() => {
    const fetchFlights = async () => {
      setIsLoading(true);
      setError(null);

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
        setFlights(data.offers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (origin && destination && departureDate && returnDate) {
      fetchFlights();
    }
  }, [origin, destination, departureDate, returnDate, adults, infants]);

  // ソート処理
  const sortedFlights = [...flights].sort((a, b) => {
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

  // ソース別に最安値を取得
  const bestBySource = flights.reduce((acc, flight) => {
    if (!acc[flight.source] || flight.price.total < acc[flight.source].price.total) {
      acc[flight.source] = flight;
    }
    return acc;
  }, {} as Record<string, FlightOffer>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            検索に戻る
          </button>

          <h1 className="text-2xl font-bold text-gray-800">
            {originAirport?.city || origin} → {destinationAirport?.city || destination}
          </h1>
          <p className="text-gray-600">
            {departureDate} 〜 {returnDate} / 大人{adults}人・乳児{infants}人
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">航空券を検索中...</p>
            <p className="text-sm text-gray-400 mt-2">
              サーバーサイドで検索を実行しています（キャッシュなし）
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              再検索する
            </button>
          </div>
        ) : (
          <>
            {/* ソース別最安値サマリー */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="font-bold text-lg text-gray-800 mb-4">各サービスの最安値</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(bestBySource).map(([source, flight]) => (
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

            {/* ソート */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">{flights.length}件の結果</p>
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

            {flights.length === 0 && (
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
