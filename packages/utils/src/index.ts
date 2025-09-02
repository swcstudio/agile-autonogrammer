/**
 * Katalyst Utilities
 * 
 * Comprehensive utility suite for the Katalyst ecosystem
 * Supporting all platforms, frameworks, and integrations
 */

// ========================================
// CORE UTILITIES
// ========================================
export * from './core/types';
export * from './core/constants';
export * from './core/errors';
export * from './core/events';
export * from './core/decorators';

// ========================================
// ASYNC & CONCURRENCY
// ========================================
export * from './async/promise-utils';
export * from './async/queue';
export * from './async/pool';
export * from './async/scheduler';
export * from './async/retry';
export * from './async/debounce-throttle';
export * from './async/rate-limiter';
export * from './async/mutex';
export * from './async/semaphore';
export * from './async/worker-pool';

// ========================================
// DATA STRUCTURES
// ========================================
export * from './data-structures/lru-cache';
export * from './data-structures/trie';
export * from './data-structures/bloom-filter';
export * from './data-structures/priority-queue';
export * from './data-structures/circular-buffer';
export * from './data-structures/graph';
export * from './data-structures/tree';
export * from './data-structures/linked-list';
export * from './data-structures/observable-map';
export * from './data-structures/immutable';

// ========================================
// PERFORMANCE
// ========================================
export * from './performance/profiler';
export * from './performance/benchmark';
export * from './performance/memory-monitor';
export * from './performance/fps-counter';
export * from './performance/metrics-collector';
export * from './performance/performance-observer';
export * from './performance/lazy-loader';
export * from './performance/virtual-list';
export * from './performance/memoize';
export * from './performance/web-vitals';

// ========================================
// VALIDATION & SANITIZATION
// ========================================
export * from './validation/schema-validator';
export * from './validation/type-guards';
export * from './validation/sanitizers';
export * from './validation/validators';
export * from './validation/zod-utils';
export * from './validation/joi-utils';
export * from './validation/yup-utils';
export * from './validation/input-filters';

// ========================================
// CRYPTO & SECURITY
// ========================================
export * from './crypto/encryption';
export * from './crypto/hashing';
export * from './crypto/jwt';
export * from './crypto/oauth';
export * from './crypto/password';
export * from './crypto/random';
export * from './crypto/signatures';
export * from './crypto/certificates';
export * from './crypto/web3-utils';
export * from './crypto/blockchain';

// ========================================
// STRING & TEXT PROCESSING
// ========================================
export * from './string/case-converters';
export * from './string/formatters';
export * from './string/parsers';
export * from './string/template-engine';
export * from './string/markdown-utils';
export * from './string/html-utils';
export * from './string/regex-utils';
export * from './string/i18n';
export * from './string/slug';
export * from './string/diff';

// ========================================
// DATE & TIME
// ========================================
export * from './datetime/formatters';
export * from './datetime/parsers';
export * from './datetime/timezone';
export * from './datetime/duration';
export * from './datetime/calendar';
export * from './datetime/cron';
export * from './datetime/relative-time';
export * from './datetime/business-days';

// ========================================
// FILE & STREAM
// ========================================
export * from './file/file-utils';
export * from './file/mime-types';
export * from './file/path-utils';
export * from './file/stream-utils';
export * from './file/zip-utils';
export * from './file/csv-parser';
export * from './file/excel-utils';
export * from './file/pdf-utils';
export * from './file/image-utils';
export * from './file/video-utils';

// ========================================
// NETWORK & HTTP
// ========================================
export * from './network/http-client';
export * from './network/websocket-client';
export * from './network/sse-client';
export * from './network/graphql-client';
export * from './network/grpc-client';
export * from './network/retry-strategies';
export * from './network/circuit-breaker';
export * from './network/load-balancer';
export * from './network/proxy';
export * from './network/tunnel';

// ========================================
// DATABASE & STORAGE
// ========================================
export * from './database/query-builder';
export * from './database/migration-utils';
export * from './database/connection-pool';
export * from './database/orm-utils';
export * from './database/redis-utils';
export * from './database/mongo-utils';
export * from './database/postgres-utils';
export * from './database/sqlite-utils';
export * from './database/indexeddb-utils';
export * from './database/localstorage-utils';

// ========================================
// DEBUGGING & LOGGING
// ========================================
export * from './debug/logger';
export * from './debug/inspector';
export * from './debug/stack-trace';
export * from './debug/error-reporter';
export * from './debug/console-utils';
export * from './debug/dev-tools';
export * from './debug/remote-debug';
export * from './debug/memory-leak-detector';
export * from './debug/performance-trace';
export * from './debug/network-inspector';

// ========================================
// TESTING & MOCKING
// ========================================
export * from './testing/test-utils';
export * from './testing/mock-factory';
export * from './testing/snapshot';
export * from './testing/fixtures';
export * from './testing/assertions';
export * from './testing/coverage';
export * from './testing/e2e-utils';
export * from './testing/visual-regression';
export * from './testing/load-testing';
export * from './testing/contract-testing';

// ========================================
// AI & ML UTILITIES
// ========================================
export * from './ai/tokenizer';
export * from './ai/embeddings';
export * from './ai/vector-store';
export * from './ai/prompt-builder';
export * from './ai/model-loader';
export * from './ai/inference';
export * from './ai/fine-tuning';
export * from './ai/rag-utils';
export * from './ai/agent-utils';
export * from './ai/nlp-utils';

// ========================================
// METAVERSE & 3D
// ========================================
export * from './metaverse/vector3';
export * from './metaverse/quaternion';
export * from './metaverse/matrix4';
export * from './metaverse/ray';
export * from './metaverse/collision';
export * from './metaverse/octree';
export * from './metaverse/spatial-hash';
export * from './metaverse/mesh-utils';
export * from './metaverse/texture-utils';
export * from './metaverse/animation-utils';

// ========================================
// PLATFORM-SPECIFIC
// ========================================
export * from './platform/browser-utils';
export * from './platform/node-utils';
export * from './platform/deno-utils';
export * from './platform/electron-utils';
export * from './platform/react-native-utils';
export * from './platform/tauri-utils';
export * from './platform/capacitor-utils';
export * from './platform/flutter-utils';
export * from './platform/wasm-utils';
export * from './platform/native-bridge';

// ========================================
// BUILD & BUNDLER PLUGINS (Existing)
// ========================================
export * from './plugins';
export * from './scraper';

// ========================================
// MATH & ALGORITHMS
// ========================================
export * from './math/statistics';
export * from './math/linear-algebra';
export * from './math/geometry';
export * from './math/interpolation';
export * from './math/random';
export * from './math/bignum';
export * from './math/units';
export * from './math/formulas';
export * from './math/graph-algorithms';
export * from './math/optimization';

// ========================================
// REACTIVE & OBSERVABLES
// ========================================
export * from './reactive/observable';
export * from './reactive/subject';
export * from './reactive/operators';
export * from './reactive/scheduler';
export * from './reactive/store';
export * from './reactive/computed';
export * from './reactive/effect';
export * from './reactive/signal';
export * from './reactive/atom';
export * from './reactive/selector';

// ========================================
// DOM & BROWSER
// ========================================
export * from './dom/query-selector';
export * from './dom/manipulation';
export * from './dom/events';
export * from './dom/styles';
export * from './dom/animation';
export * from './dom/intersection-observer';
export * from './dom/mutation-observer';
export * from './dom/resize-observer';
export * from './dom/drag-drop';
export * from './dom/clipboard';

// ========================================
// FUNCTIONAL PROGRAMMING
// ========================================
export * from './functional/compose';
export * from './functional/pipe';
export * from './functional/curry';
export * from './functional/partial';
export * from './functional/lens';
export * from './functional/monad';
export * from './functional/functor';
export * from './functional/either';
export * from './functional/maybe';
export * from './functional/io';

// ========================================
// COLLECTIONS & ARRAYS
// ========================================
export * from './collections/array-utils';
export * from './collections/object-utils';
export * from './collections/set-utils';
export * from './collections/map-utils';
export * from './collections/group-by';
export * from './collections/sort';
export * from './collections/filter';
export * from './collections/reduce';
export * from './collections/transform';
export * from './collections/diff';

// ========================================
// COLOR & GRAPHICS
// ========================================
export * from './color/converters';
export * from './color/palette';
export * from './color/contrast';
export * from './color/blend';
export * from './color/gradient';
export * from './color/theme';
export * from './color/accessibility';
export * from './color/animation';

// ========================================
// AUDIO & VIDEO
// ========================================
export * from './media/audio-processor';
export * from './media/video-processor';
export * from './media/webrtc-utils';
export * from './media/media-recorder';
export * from './media/stream-utils';
export * from './media/codec-utils';
export * from './media/subtitle-utils';
export * from './media/waveform';

// ========================================
// MONITORING & ANALYTICS
// ========================================
export * from './monitoring/telemetry';
export * from './monitoring/analytics';
export * from './monitoring/apm';
export * from './monitoring/error-tracking';
export * from './monitoring/user-tracking';
export * from './monitoring/performance-tracking';
export * from './monitoring/custom-events';
export * from './monitoring/dashboards';

// ========================================
// CLI & TERMINAL
// ========================================
export * from './cli/args-parser';
export * from './cli/prompts';
export * from './cli/spinner';
export * from './cli/progress';
export * from './cli/table';
export * from './cli/colors';
export * from './cli/logger';
export * from './cli/commands';

// ========================================
// MAIN UTILITY CLASS
// ========================================
export { KatalystUtils } from './KatalystUtils';

// ========================================
// UTILITY TYPES
// ========================================
export * from './types';