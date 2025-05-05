# Page load type

Javascript library for page load type detection supporting
Signed Exchanges (SXG), prefetching, Cloudflare cache, Early Hints, and browser cache.

## The problem it solves

When the browser loads the page, you may want to:

- report failures in loading of Signed Exchanges subresources,
- compare performance metrics (such as LCP) of different load types,
- track the load type in web analytics,
- adjust the page behavior based on type (play the video for fully prefetched website or display a fallback image otherwise).

You will find more information in my blog post on
[how to measure and monitor SXG](https://www.pawelpokrywka.com/p/measuring-signed-exchanges-impact).

## Detected page load types

The library recognizes the following page load types.

### SXG

The page was loaded using SXG.

- `sxg_complete_prefetch` - page was prefetched along with subresources,
- `sxg_document_prefetch` - only the HTML document was prefetched, subresources had to be loaded normally,
- `sxg_document_on_demand` - same as above, but instead of prefetching, SXG was loaded on demand.

The browser tried to retrieve SXG, but failed because the document was missing from the Google cache.
A fallback mechanism was activated, resulting the browser to be client-side redirected to the website.

- `sxg_fallback_on_demand_edge` - the page was served from Cloudflare cache,
- `sxg_fallback_on_demand_hints` - the page was served from the origin, but Early Hints were used,
- `sxg_fallback_on_demand_origin` - the page was served from the origin without Early Hints.

### Prefetched/cached HTML

If the `prefetched` option (see usage) was specified, then it is possible to determine if:

- `document_prefetch` - the HTML document was prefetched on the referring site,
- `browser_cache` - the page was visited before and the browser used the cached version (subresources may or may not be cached).

If the `prefetched` option is unspecified (default), then the page load type will be:

- `document_prefetch/browser_cache` - the page was served from the browser cache, but it's not clear if it was prefetched or visited previously.

### Normal loading

The page was loaded normally. It's still possible to determine if:

- `document_on_demand_edge` - the page was served from Cloudflare cache,
- `document_on_demand_hints` - the page was served from the origin, but Early Hints were used,
- `document_on_demand_origin` - the page was served from the origin without Early Hints.

## Page load type performance rating

Page load types tiers, rated from the best performance to the worst according to my measurements:

1. `sxg_complete_prefetch` / `browser_cache`
2. `sxg_fallback_on_demand_edge` / `sxg_fallback_on_demand_hints` / `document_on_demand_edge` / `document_on_demand_hints`
3. `sxg_document_prefetch` / `sxg_fallback_on_demand_origin` / `document_prefetch` / `document_on_demand_origin`
4. `sxg_document_on_demand`

Note the 1st tier is much faster, while 2nd, 3rd and 4th are quite similar to each other in terms of speed.
For the full explanation and details, see my blog post about
[measuring SXG](https://www.pawelpokrywka.com/p/measuring-signed-exchanges-impact).

## Installation & setup

Set Cloudflare to proxy your site and enable **Automatic Signed Exchanges** feature. Follow my
[SXG tutorial](https://www.pawelpokrywka.com/p/how-i-took-lcp-down-under-350ms) on how to adjust your
app code and web server configuration. Read at least first 2 parts for the basic functionality, but
to correctly handle SXG quirks I recommend reading also parts 3-6.

Deploy [SXG Status](https://github.com/pepawel/sxg-status) worker to your Cloudflare account and
mount it under `/sxg/resolve-status.js`.

Near the top of your `<head>` section, at least before first `<script>` element add:

```html
  <script data-issxg-var>window.isSXG = false</script>
  <template data-sxg-only>
    <link as='script' href='/sxg/resolve-status.js' rel='preload'>
  </template>
```

If you use `npm` to manage dependencies in your app, add `page-load-type` package:

```shell
npm install page-load-type
```

Adjust accordingly if you use `yarn` or other dependency manager.

## Usage

### getPageLoadType()

`getPageLoadType()` returns a Promise with the page load type. You can use `await` to retrieve it:

```js
  import getPageLoadType from "page-load-type";
  const loadType = await getPageLoadType();
```

Optionally you can provide an object with configuration. By default it looks like this:

```js
    {
      prefetched = undefined,
      sxgStatusConfig = {
        scriptPath: '/sxg/resolve-status.js',
        eventName: 'SxgStatusResolved',
        eventProperty: 'subresources',
      }
    }
```

The `prefetched` key is a boolean you can use to tell the library if the currently loaded page was prefetched or not.
If specified, the `getPageLoadType()` will be able to differentiate between `document_prefetch` and `browser_cache`.
If not specified, it will return one value: `document_prefetch/browser_cache` for those cases.

From my understanding, setting the `prefetched` key to the correct value requires server-side implementation.
The server has to examine the request headers, look for those related to prefetching, and let the browser know,
for example by embedding it in the HTML. The fronted code could then retrieve the value from HTML and set the
`prefetched` key accordingly.

You can use Cloudflare worker to achieve this, because worker can read request headers and modify HTML.
It may be the only option if you use Cloudflare to cache your HTML pages.

The `sxgStatusConfig` key allows to use customized SXG Status worker, if you need to for some reason.

### resolveSxgStatus()

If the only thing that interest you is SXG subresources status, then you can use the `resolveSxgStatus()` function.
It returns a Promise which *resolves* in case SXG subresources were correctly loaded and *rejects* otherwise.

```js
  import { resolveSxgStatus } from "page-load-type";
  resolveSxgStatus().
    then(() => console.log('subresources loaded with SXG')).
    catch(() => console.log('subresources failed to load with SXG'));
```

This function also accepts configuration object with `sxgStatusConfig` key.

For example usage see the `example.html` file.

## How it works

The code combines information from various sources:

- SXG document load status provided by Cloudflare ASX in window.isSXG
- SXG subresources load status provided by SXG Status worker
- browser cache usage retrieved using PerformanceNavigationTiming interface
- Early Hints usage retrieved using PerformanceResourceTiming interface
- Cloudflare cache usage provided by Cloudflare and available in PerformanceServerTiming interface
- Google SXG cache fallback detection by parsing HTTP referrer

For more details, please refer to my blog post about
[measuring SXG](https://www.pawelpokrywka.com/p/measuring-signed-exchanges-impact).
You can also check the `getPageLoadType()` implementation - the function body takes about 40 lines of code.

## Testing

Run tests with:

```
npm run test
```

## Author

My name is Paweł Pokrywka and I'm the author of `Page load type` library.

If you want to contact me or get to know me better, check out
[my blog](https://www.pawelpokrywka.com).

Thank you for your interest in this project :)

## License

The software is available as open source under the terms of the
[MIT License](https://opensource.org/licenses/MIT).
