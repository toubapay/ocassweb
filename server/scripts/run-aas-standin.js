// Starts the AAS stand-in server (server/src/modules/insurance/aasStandIn.js)
// standalone, for manual testing or pointing aasClient.js at it via
// AAS_BASE_URL. See server/docs or the insurance README section for how
// this fits into the AAS integration.
//
// Usage: node scripts/run-aas-standin.js
// Then set (e.g. in server/.env): AAS_BASE_URL=http://localhost:5099,
// AAS_PARTNER=any-partner-name, AAS_USERNAME=token,
// AAS_ACCESS_TOKEN=test-access-token

const { createAasStandIn } = require("../src/modules/insurance/aasStandIn");

const port = Number(process.env.AAS_STANDIN_PORT) || 5099;
const app = createAasStandIn({
  accessToken: process.env.AAS_STANDIN_ACCESS_TOKEN || "test-access-token",
  username: process.env.AAS_STANDIN_USERNAME || "token",
  initialStock: Number(process.env.AAS_STANDIN_INITIAL_STOCK) || 50,
});

app.listen(port, () => {
  console.log(`[aas-standin] listening on http://localhost:${port}`);
  console.log(`[aas-standin] point aasClient.js at it with AAS_BASE_URL=http://localhost:${port}`);
});
