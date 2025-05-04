const SxgStatusConfig = {
  scriptPath: '/sxg/resolve-status.js',
  eventName: 'SxgStatusResolved',
  eventProperty: 'subresources',
};

function getPageLoadType(
  {
    // Configuration
    prefetched = undefined,
    sxgStatusConfig = SxgStatusConfig,
    // Dependencies
    resolveSxgStatus = ResolveSxgStatus,
    sxgUsed = SxgUsed,
    browserCached = BrowserCached,
    fromSxgCache = FromSxgCache,
    cfCacheUsed = CfCacheUsed,
    earlyHintsUsed = EarlyHintsUsed,
  } = {}) {

  return new Promise((resolve) => {
    if (sxgUsed()) {
      if (browserCached()) {
        resolveSxgStatus({ sxgStatusConfig: sxgStatusConfig }).
          then(() => resolve('sxg_complete_prefetch')).
          catch(() => resolve('sxg_document_prefetch'));
      } else {
        resolve('sxg_document_on_demand');
      }
    } else { // non SXG
      if (fromSxgCache()) {
        if (cfCacheUsed()) {
          resolve('sxg_fallback_on_demand_edge');
        } else if (earlyHintsUsed()) {
          resolve('sxg_fallback_on_demand_hints');
        } else {
          resolve('sxg_fallback_on_demand_origin');
        }
      } else {
        if (browserCached()) {
          if (prefetched === undefined) {
            resolve('document_prefetch/browser_cache');
          } else {
            resolve(prefetched ? 'document_prefetch' : 'browser_cache');
          }
        } else {
          if (cfCacheUsed()) {
            resolve('document_on_demand_edge');
          } else if (earlyHintsUsed()) {
            resolve('document_on_demand_hints');
          } else {
            resolve('document_on_demand_origin');
          }
        }
      }
    }
  })
}

// Default dependencies (upper camel case)

let sxgSubresources = undefined;
let sxgNeverResolved = true;
function ResolveSxgStatus({ scriptLoader = ScriptLoader, config = SxgStatusConfig } = {}) {
  return new Promise((resolve, reject) => {
    if (sxgSubresources !== undefined) return sxgSubresources ? resolve() : reject();
    document.addEventListener(config.eventName, e => {
      sxgSubresources = e.detail[config.eventProperty];
      sxgSubresources ? resolve() : reject();
    }, { once: true });
    if (sxgNeverResolved) scriptLoader(config.scriptPath);
    sxgNeverResolved = false;
  });
}

function ScriptLoader(path) {
  const script = document.createElement('script');
  script.src = path;
  document.head.appendChild(script);
}

function EarlyHintsUsed() {
  for (const resource of performance.getEntriesByType("resource")) {
    if (resource.initiatorType === "early-hints") return true;
  }
  return false;
}

function CfCacheUsed() {
  return ['HIT', 'STALE', 'UPDATING'].indexOf(cfCacheStatus()) !== -1;
}

function FromSxgCache() {
  return referrerHostMatches(/^.+\.webpkgcache\.com$/i);
}

function BrowserCached() {
  try {
    const navEntry = performance.getEntriesByType("navigation")[0];
    return navEntry.deliveryType === 'cache';
  } catch (e) {
    return false;
  }
}

function SxgUsed() {
  return !!window.isSXG;
}

// Other functions (lower camel case)

function cfCacheStatus() {
  const navEntry = performance.getEntriesByType('navigation')[0];
  if (!navEntry || !navEntry.serverTiming) return null;

  const cfCacheMetric = navEntry.serverTiming.find(metric => metric.name === "cfCacheStatus");
  return cfCacheMetric ? cfCacheMetric.description : null;
}

function referrerHostMatches(regex) {
  if (!document.referrer) return false;

  try {
    const navEntry = performance.getEntriesByType("navigation")[0];
    const isNewNavigation = navEntry && navEntry.type === 'navigate';

    const referrer = new URL(document.referrer);
    const isGoogle = regex.test(referrer.hostname);
    return isGoogle && isNewNavigation;
  } catch (e) {
    return false;
  }
}

export default getPageLoadType;
export { ResolveSxgStatus as resolveSxgStatus };
