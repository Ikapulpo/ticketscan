/**
 * 乳児運賃計算ユーティリティ
 *
 * 乳児（2歳未満）の航空券は通常、大人運賃の10%程度
 * ただし航空会社によって異なる場合があります
 */

// 航空会社ごとの乳児運賃率（大人運賃に対する割合）
const INFANT_FARE_RATES: Record<string, number> = {
  // 日系航空会社
  'JAL': 0.10,  // 日本航空
  'ANA': 0.10,  // 全日空

  // アジア系航空会社
  'KE': 0.10,   // 大韓航空
  'OZ': 0.10,   // アシアナ航空
  'CI': 0.10,   // チャイナエアライン
  'BR': 0.10,   // エバー航空
  'CX': 0.10,   // キャセイパシフィック
  'SQ': 0.10,   // シンガポール航空
  'TG': 0.10,   // タイ国際航空

  // 欧米系航空会社
  'UA': 0.10,   // ユナイテッド航空
  'AA': 0.10,   // アメリカン航空
  'DL': 0.10,   // デルタ航空
  'BA': 0.10,   // ブリティッシュ・エアウェイズ
  'AF': 0.10,   // エールフランス
  'LH': 0.10,   // ルフトハンザ

  // LCC（座席が必要な場合は大人料金に近い場合も）
  'MM': 0.10,   // ピーチ
  'JW': 0.10,   // バニラエア
  '7C': 0.10,   // チェジュ航空
  'TW': 0.10,   // ティーウェイ航空

  // デフォルト
  'default': 0.10,
};

export interface PriceBreakdown {
  adultPrice: number;
  infantPrice: number;
  adultCount: number;
  infantCount: number;
  adultTotal: number;
  infantTotal: number;
  grandTotal: number;
  currency: string;
}

/**
 * 乳児運賃を計算
 */
export function calculateInfantFare(
  adultFare: number,
  airlineCode?: string
): number {
  const rate = airlineCode
    ? (INFANT_FARE_RATES[airlineCode] || INFANT_FARE_RATES['default'])
    : INFANT_FARE_RATES['default'];

  return Math.round(adultFare * rate);
}

/**
 * 家族全員の料金内訳を計算
 */
export function calculateFamilyPrice(
  adultFare: number,
  adultCount: number,
  infantCount: number,
  currency: string,
  airlineCode?: string
): PriceBreakdown {
  const infantFare = calculateInfantFare(adultFare, airlineCode);

  const adultTotal = adultFare * adultCount;
  const infantTotal = infantFare * infantCount;
  const grandTotal = adultTotal + infantTotal;

  return {
    adultPrice: adultFare,
    infantPrice: infantFare,
    adultCount,
    infantCount,
    adultTotal,
    infantTotal,
    grandTotal,
    currency,
  };
}

/**
 * 料金をフォーマット
 */
export function formatPrice(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return formatter.format(amount);
}
