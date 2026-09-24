import 'dotenv/config';

/**
 * Serverless function for Vercel and Express to fetch live Singapore bus arrival timings.
 * Endpoint: /api/bus?BusStopCode=04121
 */
export default async function handler(req, res) {
  // Read credential securely from process.env
  const accountKey = process.env.LTA_ACCOUNT_KEY;

  // BEFORE the fetch, if variable is missing or empty, return 503
  if (!accountKey || accountKey.trim() === '') {
    return res.status(503).json({
      error: 'LTA_ACCOUNT_KEY is not set. Add it in Vercel and redeploy.',
    });
  }

  // Set cache control for 20s cache matching LTA refresh cycle
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  // Accept BusStopCode query parameter, default to 04121
  const rawCode = req.query?.BusStopCode || req.query?.busStopCode || '04121';
  const busStopCode = String(rawCode).trim() || '04121';

  try {
    const upstreamUrl = `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${encodeURIComponent(busStopCode)}`;
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        AccountKey: accountKey,
      },
    });

    // Check response.ok before reading body to prevent crashing on empty 401 replies
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        upstreamStatus: upstreamRes.status,
        error: `LTA DataMall responded with HTTP ${upstreamRes.status} (${upstreamRes.statusText || 'Error'})`,
      });
    }

    const data = await upstreamRes.json();
    const servicesRaw = Array.isArray(data)
      ? (data[0]?.Services || [])
      : (data?.Services || data?.value || []);

    const nowMs = Date.now();

    // Map each service to ServiceNo and minutes until next two buses
    const simplifiedList = servicesRaw.map((service) => {
      const serviceNo = String(service.ServiceNo || service.serviceNo || '');
      const arrivalCandidates = [
        service.NextBus?.EstimatedArrival,
        service.NextBus2?.EstimatedArrival,
      ];

      const arrivals = [];
      for (const est of arrivalCandidates) {
        if (est && typeof est === 'string' && est.trim() !== '') {
          const timestamp = new Date(est).getTime();
          if (!isNaN(timestamp)) {
            const diffMinutes = Math.floor((timestamp - nowMs) / 60000);
            // Round down to whole minutes; under 1 minute or slightly past is 0 ("Arriving")
            const minutes = Math.max(0, diffMinutes);
            arrivals.push(minutes);
          }
        }
      }

      return {
        ServiceNo: serviceNo,
        serviceNo,
        arrivals,
        nextBuses: arrivals,
        ...(arrivals.length > 0 ? { nextBus: arrivals[0] } : {}),
        ...(arrivals.length > 1 ? { nextBus2: arrivals[1] } : {}),
      };
    });

    return res.status(200).json(simplifiedList);
  } catch (err) {
    return res.status(502).json({
      error: `Failed to fetch bus arrivals: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
