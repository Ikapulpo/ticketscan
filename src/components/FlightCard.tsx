'use client';

import { FlightOffer } from '@/types/flight';
import { formatPrice } from '@/lib/priceCalculator';

interface FlightCardProps {
  flight: FlightOffer;
  adults: number;
  infants: number;
}

export default function FlightCard({ flight, adults, infants }: FlightCardProps) {
  const sourceLabels: Record<string, { name: string; color: string }> = {
    skyscanner: { name: 'Skyscanner', color: 'bg-sky-100 text-sky-700' },
    amadeus: { name: 'Amadeus', color: 'bg-orange-100 text-orange-700' },
    kiwi: { name: 'Kiwi', color: 'bg-green-100 text-green-700' },
  };

  const sourceInfo = sourceLabels[flight.source] || { name: flight.source, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      {/* ヘッダー: 航空会社とソース */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-800">{flight.airline}</h3>
          <span className={`inline-block text-xs px-2 py-1 rounded-full ${sourceInfo.color}`}>
            {sourceInfo.name}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">
            {formatPrice(flight.price.total, flight.price.currency)}
          </p>
          <p className="text-xs text-gray-500">家族{adults + infants}人合計</p>
        </div>
      </div>

      {/* フライト情報 */}
      <div className="border-t border-b border-gray-100 py-4 my-4">
        {/* 往路 */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">往路</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-lg font-semibold">{flight.outbound[0]?.departure.time}</p>
              <p className="text-sm text-gray-600">{flight.outbound[0]?.departure.airport}</p>
            </div>
            <div className="flex-1 px-4">
              <div className="relative">
                <div className="border-t border-gray-300"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                  <span className="text-xs text-gray-500">
                    {flight.stops === 0 ? '直行便' : `${flight.stops}回乗換`}
                  </span>
                </div>
              </div>
              <p className="text-xs text-center text-gray-400 mt-1">{flight.duration}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{flight.outbound[0]?.arrival.time}</p>
              <p className="text-sm text-gray-600">{flight.outbound[0]?.arrival.airport}</p>
            </div>
          </div>
        </div>

        {/* 復路 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">復路</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-lg font-semibold">{flight.inbound[0]?.departure.time}</p>
              <p className="text-sm text-gray-600">{flight.inbound[0]?.departure.airport}</p>
            </div>
            <div className="flex-1 px-4">
              <div className="relative">
                <div className="border-t border-gray-300"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                  <span className="text-xs text-gray-500">
                    {flight.stops === 0 ? '直行便' : `${flight.stops}回乗換`}
                  </span>
                </div>
              </div>
              <p className="text-xs text-center text-gray-400 mt-1">{flight.duration}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{flight.inbound[0]?.arrival.time}</p>
              <p className="text-sm text-gray-600">{flight.inbound[0]?.arrival.airport}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 料金内訳 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">料金内訳</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">大人 {adults}人</span>
            <span className="text-gray-800">
              {formatPrice(flight.price.adult, flight.price.currency)} x {adults}
            </span>
          </div>
          {infants > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">乳児 {infants}人</span>
              <span className="text-gray-800">
                {formatPrice(flight.price.infant, flight.price.currency)} x {infants}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-200 font-medium">
            <span className="text-gray-700">合計</span>
            <span className="text-blue-600">{formatPrice(flight.price.total, flight.price.currency)}</span>
          </div>
        </div>
      </div>

      {/* 予約ボタン */}
      {flight.bookingUrl && (
        <a
          href={flight.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          予約サイトで詳細を見る
        </a>
      )}
    </div>
  );
}
