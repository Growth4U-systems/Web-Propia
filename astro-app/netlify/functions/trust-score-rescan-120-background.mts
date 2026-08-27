/** Dedicated day-120 endpoint, phase-locked to trust_score_120_dias. */
import { createTrustScoreRescanHandler } from "./trust-score-rescan-core.mts";

export default createTrustScoreRescanHandler("120");
