/**
 * Re-export the ingest pipeline for use in serverless API routes (via after()).
 * The pipeline itself lives in worker/pipelines/ingest.ts so the worker can
 * also import it without duplication.
 */
export { runIngestPipeline } from '../../worker/pipelines/ingest';
