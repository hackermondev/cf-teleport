## Usage
Base URL: https://cfteleport.xyz
URL query parameters:
- `proxied` - url to send request to
- `colo` [colo code](https://github.com/hackermondev/cf-teleport/blob/main/worker/src/data/datacenters.json) of cloudflare datacenter to proxy request to

https://cfteleport.xyz/?proxied=https://cloudflare.com/cdn-cgi/trace&colo=SEA
Teleport to Seattle!


# Overview
Cloudflare uses an Anycast network for handling network connections to datacenters. This means that regardless of any specific datacenter IP you connect to from their subnet, your ISP automatically routes you to the nearest Cloudflare datacenter.

This proxy ~~abuses~~ [a method](https://www.youtube.com/watch?v=qFX2KuqR5FA) using Cloudflare Workers to redirect HTTP requests to specific Cloudflare datacenters. (Huge props to Christian Proetti for finding this)

Cloudflare partitions cache based on datacenter region/location, and it can be complicated to test certain types of cache bugs making this a incredibly useful tool.

# Setup
This code is open-sourced mostly for transparency. Configuration and setup is not very easy, so I won't be including any specific instructions. Feel free to [message me](https://x.com/hackermondev) with any questions.