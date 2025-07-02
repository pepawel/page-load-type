# Page load type

A JavaScript library for page load type detection supporting Signed Exchanges (SXG),
prefetching, Cloudflare cache, Early Hints, and browser cache.

## The problem it solves

When the browser loads a page, you may want to:

- Report failures in loading of Signed Exchanges subresources
- Compare performance metrics (such as LCP) of different load types
- Track the load type in web analytics
- Adjust page behavior based on type (e.g., play videos for fully prefetched websites
  or display fallback images otherwise)

You will find more information in my blog posts on
[differentiating page load types](https://www.pawelpokrywka.com/p/different-methods-of-prefetching)
and [measuring SXG performance](https://www.pawelpokrywka.com/p/google-prefetching-methods-performance-study).

## Detected page load types

The library recognizes the following page load types:

### SXG

The page was loaded using SXG:

- `sxg_complete_prefetch` - Page was prefetched along with subresources
- `sxg_document_prefetch` - Only the HTML document was prefetched; subresources had to be loaded normally
- `sxg_document_on_demand` - Same as above, but instead of prefetching, SXG was loaded on demand

The browser tried to retrieve SXG but failed because the document was missing from the Google cache.
A fallback mechanism was activated, resulting in the browser being client-side redirected to the website:

- `sxg_fallback_on_demand_edge` - The page was served from Cloudflare cache
- `sxg_fallback_on_demand_hints` - The page was served from the origin, but Early Hints were used
- `sxg_fallback_on_demand_origin` - The page was served from the origin without Early Hints

### Prefetched/cached HTML
- `document_prefetch` - The HTML document was prefetched on the referring site
- `browser_cache` - The page was visited before and the browser used the cached version
                    (subresources may or may not be cached)

### Normal loading

The page was loaded normally. It's still possible to determine if:

- `document_on_demand_edge` - The page was served from Cloudflare cache
- `document_on_demand_hints` - The page was served from the origin, but Early Hints were used
- `document_on_demand_origin` - The page was served from the origin without Early Hints

## Page load type performance rating

It's obvious that a fully prefetched page has the best performance. However, the remaining page load types are
[not so easy to grade](https://www.pawelpokrywka.com/p/different-methods-of-prefetching).

## Installation & setup

1. Set Cloudflare to proxy your site and enable the **Automatic Signed Exchanges** feature
2. Follow my [SXG tutorial](https://www.pawelpokrywka.com/p/how-i-took-lcp-down-under-350ms) on how to
   adjust your app code and web server configuration. Read at least the first 2 parts for basic functionality,
   but to correctly handle SXG quirks, I recommend reading parts 3-6 as well
3. Deploy [SXG Status](https://github.com/pepawel/sxg-status) worker to your Cloudflare account and mount it under
   `/sxg/resolve-status.js`
4. Near the top of your `<head>` section, before the first `<script>` element, add:

```html
<script data-issxg-var>window.isSXG = false</script>
<template data-sxg-only>
  <link as='script' href='/sxg/resolve-status.js' rel='preload'>
</template>
```

If you use `npm` to manage dependencies in your app, add the `page-load-type` package:

```shell
npm install page-load-type
```

Adjust accordingly if you use `yarn` or another dependency manager.

## Usage

### getPageLoadType()

`getPageLoadType()` returns a Promise with the page load type. You can use `await` to retrieve it:

```js
import getPageLoadType from "page-load-type";
const loadType = await getPageLoadType();
```

Optionally, you can provide an object with configuration. By default, it looks like this:

```js
{
  sxgStatusConfig = {
    scriptPath: '/sxg/resolve-status.js',
    eventName: 'SxgStatusResolved',
    eventProperty: 'subresources',
  }
}
```

The `sxgStatusConfig` key allows you to use a customized [SXG Status](https://github.com/pepawel/sxg-status) worker,
if needed for some reason.

### resolveSxgStatus()

If the only thing that interests you is SXG subresources status, then you can use the `resolveSxgStatus()` function.
It returns a Promise which *resolves* if SXG subresources were correctly loaded and *rejects* otherwise.

```js
import { resolveSxgStatus } from "page-load-type";
resolveSxgStatus()
  .then(() => console.log('subresources loaded with SXG'))
  .catch(() => console.log('subresources failed to load with SXG'));
```

This function also accepts a configuration object with the `sxgStatusConfig` key.

For example usage, see the `example.html` file.
This file is meant to be placed in an SXG enabled website to function properly.

## How it works

The code combines information from various sources:

- SXG document load status provided by Cloudflare ASX in `window.isSXG`
- SXG subresources load status provided by [SXG Status](https://github.com/pepawel/sxg-status) worker
- Browser cache usage retrieved using the `PerformanceNavigationTiming` interface
- Early Hints usage retrieved using the `PerformanceResourceTiming` interface
- Cloudflare cache usage provided by Cloudflare and retrieved using the `PerformanceServerTiming` interface
- Google SXG cache fallback detection by parsing HTTP referrer

For background, please refer to my blog post about
[page load type differentiation](https://www.pawelpokrywka.com/p/different-methods-of-prefetching).
You can also check the `getPageLoadType()` implementation - the function body takes about 40 lines of code.

## Potential improvements

- Detect if the page was opened in a new tab, which would explain why subresources were not prefetched
- Detect if the user came from Google
- Detect other [page load types](https://www.pawelpokrywka.com/p/different-methods-of-prefetching) such as Google Ads

## Testing

Run tests with:

```shell
npm run test
```

## Author

My name is Paweł Pokrywka and I'm the author of the `Page load type` library.

If you want to contact me or get to know me better, check out [my blog](https://www.pawelpokrywka.com).

Thank you for your interest in this project :)

## License

The software is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
