/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */




// This is called when the Worker is
// running inside our specific datacenter
async function handleInnerRequest(request: Request) {
	const url = new URL(request.url);
	const proxy = url.searchParams.get('proxy');

	let validUrl = true;
	try { proxy && new URL(proxy) } catch { validUrl = false };
	if (!proxy || !validUrl)
		return new Response(`URL search parameters should contain a valid URL in \`proxy\``);

	const res = await fetch(proxy, {
		method: request.method,
		body: request.body,
		headers: request.headers,
	});

	const proxiedHeaders = new Headers(res.headers);
	proxiedHeaders.set('cf-teleport-cloudflare-colo', request.cf?.colo as string || '???');

	// These headers sometimes break
	const ensureHeaders = ['cf-cache-status', 'age', 'cf-ray'];
	for (let i in ensureHeaders) {
		const header = ensureHeaders[i];
		if (proxiedHeaders.has(header))
			proxiedHeaders.set(`cf-teleport-${header}`, proxiedHeaders.get(header) || '');
	}

	return new Response(res.body, {
		headers: proxiedHeaders,
		status: res.status,
		statusText: res.statusText
	});
}

import datacenters from './data/datacenters.json';
import origins from './data/origins.json';
import { findNearestLocation } from './geolocation';
import { findOnlineAddress } from './network';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const cloudflareDatacenter = url.searchParams.get('colo') as keyof typeof datacenters | null;
		const debugOverrideIp = url.searchParams.get('ip');

		if (request.cf?.colo == cloudflareDatacenter)
			return await handleInnerRequest(request);


		if (url.pathname.startsWith('/data')) {
			switch (url.pathname) {
				case '/data/datacenters.json':
					return Response.json(datacenters);
				case '/data/origins.json':
					return Response.json(origins);
			}
		}

		if (!debugOverrideIp && !cloudflareDatacenter)
			return new Response('Must specify a valid datacenter', { status: 400 });

		const originHistory: Array<number> = [];
		const maximumOriginRedirect = url.searchParams.has('max_redirects')
			? parseInt(url.searchParams.get('max_redirects') as string) : 5;


		const originHistoryHeader = request.headers.get('cf-teleport-origin-history');
		if (originHistoryHeader) originHistory.push(...originHistoryHeader.split(',').map(h => parseInt(h)));
		if (originHistory.length >= maximumOriginRedirect) return new Response('Maximum origin redirect', { status: 508 });

		const datacenter = cloudflareDatacenter && datacenters[cloudflareDatacenter];
		const availableOrigins = (origins
			.map((o, index) => originHistory.includes(index) ? false : o)
			.filter(o => o != false)
			//@ts-ignore
			.filter(o => o.asname == 'CLOUDFLARENET' && !o.org.includes('Level 3'))) as typeof origins;

		const origin = datacenter && findNearestLocation(datacenter, availableOrigins);

		let datacenterIp;
		try {
			datacenterIp = debugOverrideIp || !origin ? debugOverrideIp : findOnlineAddress(origin.query);
			if (!datacenterIp)
				return new Response('Unknown error, cannot find datacenter origin', { status: 412 });
		} catch (error) {
			//@ts-ignore
			return new Response(error, { status: 412 })
		}


		const resolveOverride = `${datacenterIp}.dns-${url.hostname}`;
		if (origin) originHistory.push(origins.indexOf(origin));

		const headers = new Headers(request.headers);
		headers.set('cf-teleport-origin-history', originHistory.join(','));

		return await fetch(request.url, {
			method: request.method,
			body: request.body,
			headers,
			cf: { resolveOverride }
		})
	},
} satisfies ExportedHandler<Env>;
