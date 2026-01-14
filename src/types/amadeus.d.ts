declare module 'amadeus' {
  interface AmadeusConfig {
    clientId: string;
    clientSecret: string;
    hostname?: string;
  }

  interface FlightOffersSearchResponse {
    data: unknown[];
  }

  interface FlightOffersSearch {
    post(body: string): Promise<FlightOffersSearchResponse>;
    get(params: Record<string, string | number>): Promise<FlightOffersSearchResponse>;
  }

  interface Shopping {
    flightOffersSearch: FlightOffersSearch;
  }

  class Amadeus {
    constructor(config: AmadeusConfig);
    shopping: Shopping;
  }

  export default Amadeus;
}
