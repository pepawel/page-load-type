function earlyHintsUsed() {
  for (const resource of performance.getEntriesByType("resource")) {
    if (resource.initiatorType === "early-hints") return true;
  }
  return false;
}

function cfCacheStatus() {
  const navEntry = performance.getEntriesByType('navigation')[0];
  if (!navEntry || !navEntry.serverTiming) return null;

  const cfCacheMetric = navEntry.serverTiming.find(metric => metric.name === "cfCacheStatus");
  return cfCacheMetric ? cfCacheMetric.description : null;
}

function cfCacheUsed() {
  return ['HIT', 'STALE', 'UPDATING'].indexOf(cfCacheStatus()) !== -1;
}

function fromSxgCache() {
  return referrerHostMatches(/^.+\.webpkgcache\.com$/i);
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

function browserCached() {
  try {
    const navEntry = performance.getEntriesByType("navigation")[0];
    return navEntry.deliveryType === 'cache';
  } catch (e) {
    return false;
  }
}

function sxgUsed() {
  return !!window.isSXG;
}

function loadSxgStatusResolver(path) {
  const script = document.createElement('script');
  script.src = path;
  document.head.appendChild(script);
}

let sxgSubresources = undefined;
let sxgStatusLoading = false;
function sxgSubresourcesPrefetched(statusPath, { loader = loadSxgStatusResolver } = {}) {
  return new Promise((resolve, reject) => {
    if (sxgSubresources !== undefined) return sxgSubresources ? resolve() : reject();
    document.addEventListener('SxgStatusResolved', e => {
      sxgSubresources = e.detail.subresources;
      sxgSubresources ? resolve() : reject();
    }, { once: true });
    if (!sxgStatusLoading) loader(statusPath);
    sxgStatusLoading = true;
  });
}

export default function getPageLoadType(
  {
    // Configuration
    statusPath = '/sxg/resolve-status.js',
    prefetched = undefined,
    // Dependencies
    statusResolver = sxgSubresourcesPrefetched,
  } = {}) {

  return new Promise((resolve) => {
    if (sxgUsed()) {
      if (browserCached()) {
        statusResolver(statusPath).
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
