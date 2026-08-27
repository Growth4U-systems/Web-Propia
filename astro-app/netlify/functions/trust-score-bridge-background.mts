/** Legacy day-60 background worker alias. Do not configure this URL in GHL. */
import { createWorkerHandler } from "./trust-score-rescan-core.mts";

export default createWorkerHandler("60");
