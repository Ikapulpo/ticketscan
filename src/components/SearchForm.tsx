'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { japaneseAirports } from '@/lib/airports';

export default function SearchForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    origin: 'NRT',
    destination: '',
    departureDate: '',
    returnDate: '',
    adults: 2,
    infants: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const params = new URLSearchParams({
      origin: formData.origin,
      destination: formData.destination,
      departureDate: formData.departureDate,
      returnDate: formData.returnDate,
      adults: formData.adults.toString(),
      infants: formData.infants.toString(),
    });

    router.push(`/results?${params.toString()}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'adults' || name === 'infants' ? parseInt(value) : value,
    }));
  };

  // 今日の日付を取得（最小日付として使用）
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        航空券検索
      </h2>

      {/* 出発地・目的地 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
            出発地
          </label>
          <select
            id="origin"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {japaneseAirports.map(airport => (
              <option key={airport.code} value={airport.code}>
                {airport.city} ({airport.code}) - {airport.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
            目的地（空港コード）
          </label>
          <input
            type="text"
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={(e) => {
              const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
              setFormData(prev => ({ ...prev, destination: value }));
            }}
            placeholder="例: BKK, SIN, LAX"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
            required
            pattern="[A-Z]{3}"
            title="3文字の空港コードを入力してください（例: BKK, SIN, LAX）"
            maxLength={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            3文字のIATA空港コードを入力（例: BKK=バンコク, SIN=シンガポール, LAX=ロサンゼルス）
          </p>
        </div>
      </div>

      {/* 日付 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700 mb-1">
            出発日
          </label>
          <input
            type="date"
            id="departureDate"
            name="departureDate"
            value={formData.departureDate}
            onChange={handleChange}
            min={today}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="returnDate" className="block text-sm font-medium text-gray-700 mb-1">
            帰国日
          </label>
          <input
            type="date"
            id="returnDate"
            name="returnDate"
            value={formData.returnDate}
            onChange={handleChange}
            min={formData.departureDate || today}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* 人数 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="adults" className="block text-sm font-medium text-gray-700 mb-1">
            大人（12歳以上）
          </label>
          <select
            id="adults"
            name="adults"
            value={formData.adults}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {[1, 2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n}人</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="infants" className="block text-sm font-medium text-gray-700 mb-1">
            乳児（2歳未満）
          </label>
          <select
            id="infants"
            name="infants"
            value={formData.infants}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {[0, 1, 2].map(n => (
              <option key={n} value={n}>{n}人</option>
            ))}
          </select>
        </div>
      </div>

      {/* 家族構成サマリー */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <span className="font-medium">検索条件:</span> 大人{formData.adults}人 + 乳児{formData.infants}人
        </p>
        <p className="text-xs text-blue-600 mt-1">
          ※ 乳児運賃は大人運賃の約10%で自動計算されます
        </p>
      </div>

      {/* 検索ボタン */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            検索中...
          </span>
        ) : (
          '航空券を検索'
        )}
      </button>

      {/* キャッシュ対策の説明 */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        サーバーサイドで検索を行うため、キャッシュによる価格変動の影響を受けません
      </p>
    </form>
  );
}
