function earlyHintsUsed() {
  for (const resource of performance.getEntriesByType("resource")) {
    if (resource.initiatorType === "early-hints") return true;
  }
  return false;
}

function cacheStatus() {
  const navEntry = performance.getEntriesByType('navigation')[0];
  if (!navEntry || !navEntry.serverTiming) return null;

  const cfCacheMetric = navEntry.serverTiming.find(metric => metric.name === "cfCacheStatus");
  return cfCacheMetric ? cfCacheMetric.description : null;
}

function cacheUsed() {
  return ['HIT', 'STALE', 'UPDATING'].indexOf(cacheStatus()) !== -1;
}

function isFromSxgCache() {
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

function isCached() {
  try {
    const navEntry = performance.getEntriesByType("navigation")[0];
    return navEntry.deliveryType === 'cache';
  } catch (e) {
    return false;
  }
}

function isSxgPageLoad(statusPath) {
  if (document.querySelectorAll('template[data-sxg-only]').length) return false;
  if (document.querySelectorAll(`link[as="script"][rel="preload"][href="${statusPath}"]`).length) return true;
  return undefined;
}

function loadSxgStatusResolver(path) {
  const script = document.createElement('script');
  script.src = path;
  document.head.appendChild(script);
}

let pageLoadType = undefined;

export default function getPageLoadType({ statusPath = '/sxg/resolve-status.js', prefetched = undefined } = {}) {
  if (pageLoadType) return new Promise((resolve) => resolve(pageLoadType));

  return new Promise((rawResolve) => {
    const resolve = value => (pageLoadType = value, rawResolve(value));

    if (isSxgPageLoad(statusPath)) {
      if (isCached()) {
        document.addEventListener('SxgStatusResolved', function (e) {
          resolve(e.detail.subresources ? 'sxg_complete_prefetch' : 'sxg_document_prefetch');
        });
        loadSxgStatusResolver(statusPath);
      } else {
        resolve('sxg_document_on_demand');
      }
    } else { // non SXG
      if (isFromSxgCache()) {
        if (cacheUsed()) {
          resolve('sxg_fallback_on_demand_edge');
        } else if (earlyHintsUsed()) {
          resolve('sxg_fallback_on_demand_hints');
        } else {
          resolve('sxg_fallback_on_demand_origin');
        }
      } else {
        if (isCached()) {
          if (prefetched === undefined) {
            resolve('document_prefetch_or_browser_cache');
          } else {
            resolve(prefetched ? 'document_prefetch' : 'browser_cache');
          }
        } else {
          if (cacheUsed()) {
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
