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

function sxgUsed(statusPath) {
  if (document.querySelectorAll('template[data-sxg-only]').length) return false;
  if (document.querySelectorAll(`link[as="script"][rel="preload"][href="${statusPath}"]`).length) return true;
  return undefined;
}

const sxgStatusResolving = {};
function loadSxgStatusResolver(path) {
  if (sxgStatusResolving[path]) return;
  const script = document.createElement('script');
  script.src = path;
  document.head.appendChild(script);
  sxgStatusResolving[path] = true;
}

export default function getPageLoadType({ statusPath = '/sxg/resolve-status.js', prefetched = undefined } = {}) {
  return new Promise((resolve) => {
    if (sxgUsed(statusPath)) {
      if (browserCached()) {
        document.addEventListener('SxgStatusResolved', () => {
          resolve(e.detail.subresources ? 'sxg_complete_prefetch' : 'sxg_document_prefetch');
        }, { once: true });
        loadSxgStatusResolver(statusPath);
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
