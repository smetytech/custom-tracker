import type { Transport, TrackEvent } from "../types";
export interface HttpTransportOptions {
    apiKey: string;
    endpoint: string;
    projectId?: string;
    sourceIdentifier?: string;
    headers?: Record<string, string>;
    useBeacon?: boolean;
}
export declare class HttpTransport implements Transport {
    private endpoint;
    private headers;
    private useBeacon;
    constructor(options: HttpTransportOptions);
    send(events: TrackEvent[]): Promise<void>;
    private sendWithBeacon;
    private sendWithFetch;
}
export declare function createHttpTransport(options: HttpTransportOptions): HttpTransport;
//# sourceMappingURL=http.d.ts.map