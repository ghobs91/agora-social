import { WorkerRelayInterface } from "@snort/worker-relay";

// when using Vite import the worker script directly (for production)
import WorkerVite from "@snort/worker-relay/src/worker?worker";

// in dev mode import esm module, i have no idea why it has to work like this
const workerScript = import.meta.env.DEV
  ? new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url)
  : new WorkerVite();

const workerRelay = new WorkerRelayInterface(workerScript);

// load sqlite database and run migrations
await workerRelay.init({
  databasePath: "relay.db",
  insertBatchSize: 100,
});

// Query worker relay with regular nostr REQ command
const results = await workerRelay.query(["REQ", "1", { kinds: [1], limit: 10 }]);

// publish a new event to the relay
const myEvent = {
  kind: 1,
  created_at: Math.floor(new Date().getTime() / 1000),
  content: "test",
  tags: [],
};
if (await workerRelay.event(myEvent)) {
  console.log("Success");
}
