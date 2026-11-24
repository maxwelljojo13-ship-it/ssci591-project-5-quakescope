# QuakeScope

[Live application](https://quakescope-pro5.pages.dev/) · [Source repository](https://github.com/maxwelljojo13-ship-it/ssci591-project-5-quakescope)

Published November 24, 2026 on Cloudflare Pages via Direct Upload. Production deployment: 072b1604-6792-4a74-87f6-92ed90acbcac.

Students use QuakeScope to explore the location, magnitude and depth of global earthquakes in January 2024.

A new, static Web GIS application for SSCI 591 Project 5. The app contains **623 USGS earthquake records** with magnitude 4.5 or greater, within the UTC interval `2024-01-01T00:00:00Z <= time < 2024-02-01T00:00:00Z`. This is a historical archive, not a live warning service.

## Features

- Interactive Leaflet map with a locally hosted Natural Earth country basemap.
- Combined magnitude, depth, UTC week and place filters.
- Event popups, magnitude/time sorting and filtered CSV export.
- Responsive phone layout, accessible event buttons and a meaningful empty state.
- No API key, tracking script, user account or external runtime data dependency.

## Run locally

From the repository root, use `python -m http.server 8786 --directory dist` and open `http://localhost:8786`. Opening `index.html` with `file://` will block the GeoJSON fetch in some browsers; use HTTP.

No package installation or build is required. Node 20+ can run the optional logic checks with `npm test` or `node --test scripts/logic.test.mjs`.

## Deploy to Cloudflare Pages

The cloud's job is static page and asset hosting. Cloudflare Pages is used as PaaS: the author manages source, data, content and deployment settings; Cloudflare manages the servers, operating system, HTTPS and CDN.

### Direct Upload

1. Sign in to Cloudflare and open Workers & Pages.
2. Create a Pages application using Direct Upload / drag and drop.
3. Name the project `quakescope-pro5` or another available name.
4. Upload the contents of `dist` (or the supplied deployment ZIP, whose root is `index.html`). Do not upload the repository root.
5. Deploy and open the returned production `https://...pages.dev` URL in a private browser window.

Direct Upload projects cannot later be converted to Git integration without creating a new project. This app has no Pages Functions or Worker, no environment variables, and no paid resources.

### Git integration alternative

Create a public GitHub repository containing these source files. In Cloudflare, choose Git integration, connect that repository, select production branch `main`, framework preset `None`, no build command, and output directory `dist`. Limit any GitHub app authorization to this repository.

The public GitHub repository is the assignment's code deliverable even when Direct Upload is used for hosting. Do not upload the course PDF, personal files or account screenshots to the public repository.

## Architecture

```text
GitHub source ------ manual upload or Git deployment ------> Cloudflare Pages
                                                            HTML/CSS/JS + GeoJSON
                                                                      |
                                                                    HTTPS
                                                                      v
                                                                  Browser
                                                         map + filters + CSV export
```

USGS and Natural Earth were the upstream data sources during preparation. Browsing the application does not call them. All filtering and rendering execute on the user's device; there is no cloud analysis.

## Dataset and reproducibility

Source query:

https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2024-01-01T00:00:00&endtime=2024-02-01T00:00:00&minmagnitude=4.5&eventtype=earthquake&orderby=time-asc

Data retrieved November 24, 2026. The preparation step enforces an exclusive February 1 end boundary and retains event ID, magnitude, magnitude type, place, time, official URL, review status and point geometry. USGS may revise the source catalog. Depth classes are shallow `<70 km`, intermediate `70–300 km`, and deep `>300 km`. These bins are exhaustive and non-overlapping. GeoJSON uses `[longitude, latitude, depth]`; Leaflet receives `[latitude, longitude]`.

The basemap is Natural Earth's 1:110m country dataset. Only the English country name and geometry are retained. It is generalized and unsuitable for street-level interpretation; depicted boundaries do not establish legal claims. Symbol radius is a visual magnitude cue, not an estimate of damage or energy.

To recreate the reduced data, download both originals into `dist/data` under the existing filenames, then run `python scripts/prepare_data.py`. The script preserves original downloads in the ignored `source_data` folder. The final GeoJSON is committed so that the app requires no preprocessing to run.

## Cost and limits

Cloudflare's published pricing states that static asset requests are free and unlimited. Pages also lists unlimited bandwidth. The Free plan allows 500 Git builds per month, 20,000 files per site and 25 MiB per file; dashboard drag and drop accepts at most 1,000 files. The supplied app is below all these limits.

Using a 30-day month and an intentionally conservative **0.70 MB uncached download per visit**, 100 visits/day gives 3,000 visits and 2.1 GB/month. At 100,000 visits/day, 3,000,000 visits transfer about 2.1 TB/month. **Estimated Pages hosting bill: $0/month in both scenarios**, assuming the present static-only architecture and current plan terms. Requests and data out increase with traffic, but neither is a paid meter for this app. Adding Functions, other billed services, or a paid plan could change the bill. Browser caching and compression should reduce actual transfer. No custom domain purchase is included.

Official references, checked November 24, 2026:

- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://www.cloudflare.com/products/pages/
- https://developers.cloudflare.com/pages/get-started/direct-upload/

## Safety and testing

Only application files and public datasets are in `dist`. `_headers` configures a same-origin Content Security Policy, disallows embedding and sensitive device permissions, and sets `nosniff`. It contains no secret credentials. Event text is inserted with `textContent`; external event links are restricted to HTTPS on `earthquake.usgs.gov`. Account dashboard screenshots should be kept in the private coursework submission, not the public site.

Automated checks cover the source records' structure and time range, non-overlapping week and depth boundaries, combined filters, search, sorting and CSV escaping. Local desktop checks verify map rendering, event popups and empty-state behavior. Phone viewport emulation is a layout check; it does **not** replace the required physical phone/cellular and other-person tests.

Validation completed November 24, 2026: the live map loaded 623 records and the M7+ filter returned two events with no browser errors. The student confirmed that phone access with Wi-Fi off, another-person access with event details, and computer private-window access all worked. Device/browser models were not supplied. The actual Cloudflare account showed the Free plan and zero Workers usage; these counters do not measure static Pages visits. An earlier phone-layout issue was corrected with fractional zoom and automatic map refitting. All 16 published source files were downloaded from GitHub and matched the local source byte for byte before this testing note was updated. Keep the app live until grades are posted.

## Credits

- USGS ComCat earthquake catalog: https://earthquake.usgs.gov/fdsnws/event/1/
- Natural Earth, public domain: https://www.naturalearthdata.com/about/terms-of-use/
- Country GeoJSON source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- Leaflet 1.9.4, BSD 2-Clause: https://leafletjs.com/ ; license in `dist/vendor/LICENSE-Leaflet.txt`.
- OpenAI Codex assisted with code, interface design, tests and documentation. The student should review and understand the submitted work.
