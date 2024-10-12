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

import colos from './data/colos.json';
import datacenters from './data/datacenters.json';


export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const cloudflareDatacenter = url.searchParams.get('colo');
		const debugOverrideIp = url.searchParams.get('ip');

		if ((request.cf?.colo == cloudflareDatacenter) || url.searchParams.has('override'))
			return await handleInnerRequest(request);


		if (url.pathname.startsWith('/data')) {
			switch (url.pathname) {
				case '/data/datacenters.json':
					return Response.json(datacenters);
				case '/data/colos.json':
					return Response.json(colos);
			}
		}

		const origin = colos.find(c => c.colo == cloudflareDatacenter);
		if (!debugOverrideIp && !origin)
			return new Response('Must specify a valid datacenter', { status: 400 });

		const datacenterIp = debugOverrideIp ? debugOverrideIp : origin?.open[0];
		const resolveOverride = `${datacenterIp}.dns.${url.hostname}`;
		const timeout = url.searchParams.has('timeout') ?
			parseInt(url.searchParams.get('timeout') || '') : null;

		const abort = new AbortController();
		if (timeout && !isNaN(timeout)) setTimeout(() => abort.abort(), timeout);
		if (debugOverrideIp) url.searchParams.set('override', '1');

		const response = await fetch(url, {
			method: request.method,
			body: request.body,
			headers: request.headers,
			cf: { resolveOverride },
			signal: abort.signal,
		}).catch(err => err);
		if (response instanceof Error && abort.signal.aborted) {
			return new Response('Timeout', { status: 522 });
		}

		return response;
	},
} satisfies ExportedHandler<Env>;
