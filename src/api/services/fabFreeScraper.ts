import { FabFreeItem, extractFabFreeItems } from '../utils/fabFreeParser';
import { fetchImpersonated } from '../utils/curlImpersonate';

const FAB_FREE_PAGE_URL = 'https://www.fab.com/limited-time-free';
const FAB_FREE_BLADE_URL = 'https://www.fab.com/i/blades/free_content_blade';

export const scrapeFabFree = async (): Promise<FabFreeItem[]> => {
  const payload = await fetchFabFreeBlade();
  return extractFabFreeItems(payload);
};

const fetchFabFreeBlade = async (): Promise<unknown> => {
  const body = await fetchImpersonated({
    url: FAB_FREE_BLADE_URL,
    // Cloudflare tends to apply stricter rules to the /i/blades/* API path than
    // to normal pages, and hitting the page first earns the __cf_bm session
    // cookie a browser would carry into the API request.
    warmupUrl: FAB_FREE_PAGE_URL,
    headers: {
      accept: 'application/json',
      referer: FAB_FREE_PAGE_URL,
    },
    rejectBody: (payload) => (/^[[{]/.test(payload) ? null : 'body was not JSON'),
  });
  return JSON.parse(body);
};
