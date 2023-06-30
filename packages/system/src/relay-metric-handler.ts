import { FeedCache } from "@snort/shared";
import { Connection } from "connection";
import { RelayMetrics } from "cache";

export class RelayMetricHandler {
    readonly #cache: FeedCache<RelayMetrics>;

    constructor(cache: FeedCache<RelayMetrics>) {
        this.#cache = cache;
    }

    onDisconnect(c: Connection, code: number) {
        
    }
}