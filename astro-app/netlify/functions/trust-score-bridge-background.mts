/**
 * Compatibility URL for the existing GHL day-60 Custom Webhook.
 * Netlify detects the -background suffix and immediately acknowledges with 202.
 */
import { createTrustScoreRescanHandler } from "./trust-score-rescan-core.mts";

export default createTrustScoreRescanHandler("60");
