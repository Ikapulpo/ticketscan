'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SavedSearch, getSavedSearches, deleteSearch, updateSearchNote } from '@/lib/storage';
import { allAirports } from '@/lib/airports';

export default function SavedSearchesPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    setSearches(getSavedSearches());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('この検索結果を削除しますか？')) {
      deleteSearch(id);
      setSearches(getSavedSearches());
    }
  };

  const handleReSearch = (search: SavedSearch) => {
    const params = new URLSearchParams({
      origin: search.params.origin,
      destinations: search.params.destinations.join(','),
      departureDate: search.params.departureDate,
      returnDate: search.params.returnDate,
      adults: search.params.adults.toString(),
      infants: search.params.infants.toString(),
    });
    router.push(`/results?${params.toString()}`);
  };

  const handleSaveNote = (id: string) => {
    updateSearchNote(id, noteText);
    setSearches(getSavedSearches());
    setEditingNote(null);
  };

  const getAirportCity = (code: string) => {
    return allAirports.find(a => a.code === code)?.city || code;
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-2xl font-bold text-gray-800">保存した検索結果</h1>
          <p className="text-gray-600">過去の検索条件と最安値を確認できます</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {searches.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <p className="text-gray-600 mb-4">保存した検索結果はありません</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              検索する
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map((search) => (
              <div key={search.id} className="bg-white rounded-lg shadow-md p-6">
                {/* ヘッダー */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">
                      {getAirportCity(search.params.origin)} 発
                      {search.params.destinations.length === 1
                        ? ` → ${getAirportCity(search.params.destinations[0])}`
                        : ` / ${search.params.destinations.length}都市比較`
                      }
                    </h3>
                    <p className="text-sm text-gray-600">
                      {search.params.departureDate} 〜 {search.params.returnDate}
                    </p>
                    <p className="text-xs text-gray-500">
                      大人{search.params.adults}人・乳児{search.params.infants}人
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {new Date(search.savedAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>

                {/* 結果サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                  {search.results.map((result) => (
                    <div key={result.destination} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700">
                        {getAirportCity(result.destination)}
                      </p>
                      <p className="text-xs text-gray-500">{result.destination}</p>
                      {result.cheapestPrice ? (
                        <>
                          <p className="text-lg font-bold text-blue-600">
                            ¥{result.cheapestPrice.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">{result.airline}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">結果なし</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* メモ */}
                {editingNote === search.id ? (
                  <div className="mb-4">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="メモを入力..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveNote(search.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="px-3 py-1 text-gray-600 text-sm hover:bg-gray-100 rounded"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : search.note ? (
                  <div
                    className="mb-4 p-3 bg-yellow-50 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-yellow-100"
                    onClick={() => {
                      setEditingNote(search.id);
                      setNoteText(search.note || '');
                    }}
                  >
                    {search.note}
                  </div>
                ) : null}

                {/* アクション */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleReSearch(search)}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    再検索
                  </button>
                  <button
                    onClick={() => {
                      setEditingNote(search.id);
                      setNoteText(search.note || '');
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                  >
                    メモ
                  </button>
                  <button
                    onClick={() => handleDelete(search.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
