import 'dotenv/config';

/**
 * Health check serverless function for Vercel and Express.
 * Reports whether LTA_ACCOUNT_KEY is configured and whether LTA answered,
 * including upstream HTTP status code. Never prints the key or any part of it.
 * Endpoint: /api/health
 */
export default async function handler(req, res) {
  const accountKey = process.env.LTA_ACCOUNT_KEY;

  // BEFORE the fetch, if variable is missing or empty, return 503
  if (!accountKey || accountKey.trim() === '') {
    return res.status(503).json({
      keyConfigured: false,
      error: 'LTA_ACCOUNT_KEY is not set. Add it in Vercel and redeploy.',
    });
  }

  try {
    const upstreamUrl = 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121';
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        AccountKey: accountKey,
      },
    });

    // Check response.ok before reading body to avoid crashing on empty 401 replies
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        keyConfigured: true,
        ltaAnswered: true,
        upstreamStatus: upstreamRes.status,
        error: `LTA DataMall responded with HTTP ${upstreamRes.status} (${upstreamRes.statusText || 'Error'})`,
      });
    }

    return res.status(200).json({
      keyConfigured: true,
      ltaAnswered: true,
      upstreamStatus: upstreamRes.status,
      status: 'ok',
    });
  } catch (err) {
    return res.status(502).json({
      keyConfigured: true,
      ltaAnswered: false,
      error: `Failed to connect to LTA DataMall: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
