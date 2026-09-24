import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bus,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface BusService {
  ServiceNo: string;
  serviceNo?: string;
  arrivals: number[];
  nextBuses?: number[];
  nextBus?: number;
  nextBus2?: number;
}

interface HealthStatus {
  keyConfigured: boolean;
  ltaAnswered?: boolean;
  upstreamStatus?: number;
  error?: string;
  status?: string;
}

const POPULAR_STOPS = [
  { code: '04121', name: 'SMU / Bras Basah Rd (Default)' },
  { code: '01012', name: 'Victoria St / Hotel Grand Pacific' },
  { code: '03222', name: 'Opp The Treasury' },
  { code: '08057', name: 'Dhoby Ghaut Stn' },
  { code: '10169', name: 'Opp VivoCity' },
];

export default function App() {
  const [busStopCode, setBusStopCode] = useState<string>('04121');
  const [inputCode, setInputCode] = useState<string>('04121');
  const [services, setServices] = useState<BusService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(20);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch live bus arrivals
  const fetchArrivals = useCallback(async (codeToFetch: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bus?BusStopCode=${encodeURIComponent(codeToFetch)}`);
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data?.error || `Server responded with status ${res.status}`;
        setError(errorMsg);
        setServices([]);
      } else {
        // Handle list format (array) or object format
        const serviceList: BusService[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.services)
          ? data.services
          : [];

        // Sort naturally by ServiceNo
        serviceList.sort((a, b) =>
          (a.ServiceNo || '').localeCompare(b.ServiceNo || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        );

        setServices(serviceList);
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError(
        `Failed to connect to local server: ${err instanceof Error ? err.message : String(err)}`
      );
      setServices([]);
    } finally {
      setLoading(false);
      setCountdown(20);
    }
  }, []);

  // Fetch health status
  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({
        keyConfigured: false,
        error: `Could not reach health check: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Initial load and periodic refresh every 20 seconds
  useEffect(() => {
    checkHealth();
    fetchArrivals(busStopCode);

    // Refresh bus arrivals every 20 seconds
    const refreshTimer = setInterval(() => {
      fetchArrivals(busStopCode);
    }, 20000);

    return () => clearInterval(refreshTimer);
  }, [busStopCode, fetchArrivals, checkHealth]);

  // Countdown ticker for 20-second refresh
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 20));
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [lastUpdated]);

  const handleStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (clean) {
      setBusStopCode(clean);
      fetchArrivals(clean);
    }
  };

  const handleSelectPreset = (code: string) => {
    setInputCode(code);
    setBusStopCode(code);
    fetchArrivals(code);
  };

  // Format arrival time label
  const renderArrivalBadge = (minutes: number, index: number) => {
    const isArriving = minutes < 1;

    return (
      <div
        key={index}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
          isArriving
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 animate-pulse'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}
      >
        <Clock className={`w-3.5 h-3.5 ${isArriving ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`} />
        <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-0.5">
          {index === 0 ? 'Next' : '2nd'}:
        </span>
        <span className="font-semibold">
          {isArriving ? 'Arriving' : `${minutes} min`}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Live Bus Arrivals
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  SMU Project
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Singapore Transit Timings Panel
              </p>
            </div>
          </div>

          {/* Service Health Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={checkHealth}
              disabled={healthLoading}
              title="Click to re-check API health status"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {health?.keyConfigured ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-300">
                    API Active {health.upstreamStatus ? `(${health.upstreamStatus})` : ''}
                  </span>
                </>
              ) : health?.keyConfigured === false ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Key Not Configured (503)
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Checking Health...</span>
                </>
              )}
            </button>

            {/* Refresh countdown pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${
                  loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''
                }`}
              />
              <span>Refresh in {countdown}s</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Missing API Key Alert Notice if 503 */}
        {error && error.includes('LTA_ACCOUNT_KEY is not set') && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold">LTA_ACCOUNT_KEY is not set</p>
              <p className="text-amber-800 dark:text-amber-300">
                To fetch real-time bus arrivals from LTA DataMall, add your <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-xs">LTA_ACCOUNT_KEY</code> in environment variables or Vercel and redeploy.
              </p>
            </div>
          </div>
        )}

        {/* Bus Stop Selector Card */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <form onSubmit={handleStopSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter 5-digit Bus Stop Code (e.g. 04121)"
                maxLength={10}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono tracking-wider font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>Search Stop</span>
            </button>
            <button
              type="button"
              onClick={() => fetchArrivals(busStopCode)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              title="Refresh right now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </form>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 font-medium mr-1">Popular stops:</span>
            {POPULAR_STOPS.map((preset) => (
              <button
                key={preset.code}
                onClick={() => handleSelectPreset(preset.code)}
                className={`px-3 py-1 rounded-lg border transition-all ${
                  busStopCode === preset.code
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="font-mono font-bold mr-1.5">{preset.code}</span>
                <span className="opacity-80">{preset.name.split(' (')[0]}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Bus Arrival Live Panel */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold tracking-tight">
                Bus Stop <span className="font-mono text-emerald-600 dark:text-emerald-400">{busStopCode}</span> Arrivals
              </h2>
            </div>
            {lastUpdated && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Error Message (Other than 503 missing key) */}
          {error && !error.includes('LTA_ACCOUNT_KEY is not set') && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to load bus arrival data</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Services List */}
          {loading && services.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto opacity-75" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Fetching live bus arrival timings...
              </p>
            </div>
          ) : services.length === 0 && !error ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
              <Bus className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                No buses currently running for this bus stop.
              </p>
              <p className="text-xs text-slate-500">
                Services may have concluded operations for the night, or check that the bus stop code is valid.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((service) => {
                const serviceNumber = service.ServiceNo || service.serviceNo || '—';
                const arrivalTimes = Array.isArray(service.arrivals) ? service.arrivals : [];
                const hasRunningBuses = arrivalTimes.length > 0;

                return (
                  <div
                    key={serviceNumber}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                  >
                    {/* Bus Service Badge */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-12 rounded-xl bg-slate-900 dark:bg-emerald-950/80 text-white border border-slate-800 dark:border-emerald-600/40 flex items-center justify-center font-bold text-xl tracking-tight shadow-xs">
                        {serviceNumber}
                      </div>
                      <div>
                        <div className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                          Service
                        </div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Bus {serviceNumber}
                        </div>
                      </div>
                    </div>

                    {/* Arrival Times or Plain Sentence */}
                    <div className="flex items-center gap-2">
                      {hasRunningBuses ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {arrivalTimes.slice(0, 2).map((mins, idx) =>
                            renderArrivalBadge(mins, idx)
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic text-right max-w-[180px]">
                          No buses currently running for this service.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer with exact required license attribution */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto py-6 px-4">
        <div className="max-w-5xl mx-auto space-y-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center sm:text-left">
          <p data-testid="licence-attribution">
            Contains information from LTA DataMall Bus Arrival accessed on [DATE] from the Land Transport Authority (LTA DataMall), which is made available under the terms of the Singapore Open Data Licence version 1.0{' '}
            <a
              href="https://data.gov.sg/open-data-licence"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 underline hover:opacity-80 inline-flex items-center gap-0.5 font-medium"
            >
              <span>https://data.gov.sg/open-data-licence</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
            . This is an SMU course project and is not affiliated with or endorsed by the Land Transport Authority.
          </p>
        </div>
      </footer>
    </div>
  );
}
