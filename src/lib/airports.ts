import { Airport } from '@/types/flight';

export const japaneseAirports: Airport[] = [
  { code: 'NRT', name: '成田国際空港', city: '東京' },
  { code: 'HND', name: '羽田空港', city: '東京' },
  { code: 'KIX', name: '関西国際空港', city: '大阪' },
  { code: 'NGO', name: '中部国際空港', city: '名古屋' },
  { code: 'FUK', name: '福岡空港', city: '福岡' },
  { code: 'CTS', name: '新千歳空港', city: '札幌' },
  { code: 'OKA', name: '那覇空港', city: '沖縄' },
];

export const popularDestinations: Airport[] = [
  // アジア
  { code: 'ICN', name: '仁川国際空港', city: 'ソウル' },
  { code: 'TPE', name: '桃園国際空港', city: '台北' },
  { code: 'HKG', name: '香港国際空港', city: '香港' },
  { code: 'BKK', name: 'スワンナプーム国際空港', city: 'バンコク' },
  { code: 'SIN', name: 'チャンギ国際空港', city: 'シンガポール' },
  { code: 'MNL', name: 'ニノイ・アキノ国際空港', city: 'マニラ' },
  { code: 'SGN', name: 'タンソンニャット国際空港', city: 'ホーチミン' },
  { code: 'HAN', name: 'ノイバイ国際空港', city: 'ハノイ' },
  { code: 'KUL', name: 'クアラルンプール国際空港', city: 'クアラルンプール' },
  { code: 'DPS', name: 'ングラ・ライ国際空港', city: 'バリ' },
  // 中国
  { code: 'PVG', name: '上海浦東国際空港', city: '上海' },
  { code: 'PEK', name: '北京首都国際空港', city: '北京' },
  // オセアニア
  { code: 'SYD', name: 'シドニー国際空港', city: 'シドニー' },
  { code: 'AKL', name: 'オークランド国際空港', city: 'オークランド' },
  // ハワイ・グアム
  { code: 'HNL', name: 'ダニエル・K・イノウエ国際空港', city: 'ホノルル' },
  { code: 'GUM', name: 'グアム国際空港', city: 'グアム' },
  // アメリカ
  { code: 'LAX', name: 'ロサンゼルス国際空港', city: 'ロサンゼルス' },
  { code: 'SFO', name: 'サンフランシスコ国際空港', city: 'サンフランシスコ' },
  { code: 'JFK', name: 'ジョン・F・ケネディ国際空港', city: 'ニューヨーク' },
  // ヨーロッパ
  { code: 'LHR', name: 'ヒースロー空港', city: 'ロンドン' },
  { code: 'CDG', name: 'シャルル・ド・ゴール空港', city: 'パリ' },
  { code: 'FRA', name: 'フランクフルト空港', city: 'フランクフルト' },
];

export const allAirports = [...japaneseAirports, ...popularDestinations];
