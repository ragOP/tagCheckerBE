const Fastify = require("fastify");
const axios = require("axios");
const cheerio = require("cheerio");

const fastify = Fastify({ logger: true });

// ✅ CORS for all origins
fastify.register(require("@fastify/cors"), { origin: true });

fastify.post("/check", async (request, reply) => {
  const url = request.body.url;

  if (!url) {
    return reply.status(400).send({ error: "URL is required" });
  }

  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const results = {
      url,
      googleTagManager: {
        head: false,
        body: false,
        headCode: null,
        bodyCode: null,
      },
      ringba: {
        present: false,
        snippet: null,
      },
      telDIDs: [],
    };

    // Check GTM in <head>
    $("head script").each((_, el) => {
      const script = $(el).html();
      if (script && script.includes("googletagmanager.com/gtm.js")) {
        results.googleTagManager.head = true;
        results.googleTagManager.headCode = script.trim();
      }
    });

    // Check GTM in <body>
    $("body noscript").each((_, el) => {
      const noscript = $(el).html();
      if (noscript && noscript.includes("googletagmanager.com/ns.html")) {
        results.googleTagManager.body = true;
        results.googleTagManager.bodyCode = noscript.trim();
      }
    });

    // Check Ringba
    $("script").each((_, el) => {
      const script = $(el).html();
      if (script && script.includes("ringba.com")) {
        results.ringba.present = true;
        results.ringba.snippet = script.trim();
      }
    });

    // Check tel: DIDs
    $("a[href^='tel:']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) results.telDIDs.push(href);
    });

    reply.send(results);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
});

// Start the server
fastify.listen({ port: 5050, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Fastify server running at ${address}`);
});
