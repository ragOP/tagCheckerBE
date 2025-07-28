const Fastify = require("fastify");
const axios = require("axios");
const cheerio = require("cheerio");

const fastify = Fastify({ logger: true });

fastify.register(require("@fastify/cors"), { origin: true });

fastify.post("/check", async (request, reply) => {
  const url = request.body.url;

  if (!url) {
    return reply.status(400).send({ error: "URL is required" });
  }

  try {
    const response = await axios.get(url, { responseType: "text" });
    const html = response.data;
    const $ = cheerio.load(html);

    const results = {
      url,
      analytics: {
        googleAnalytics: html.includes("googletagmanager.com/analytics.js") || html.includes("gtag"),
        facebookPixel: html.includes("connect.facebook.net/en_US/fbevents.js"),
        clarity: html.includes("clarity.ms"),
        hotjar: html.includes("static.hotjar.com"),
        tiktok: html.includes("tiktok.com/i18n/pixel"),
        linkedin: html.includes("snap.licdn.com/li.lms-analytics")
      },
      security: {
        insecureScripts: [],
        iframes: [],
      },
      performance: {
        largeImages: [],
        blockingScripts: [],
        blockingCSS: []
      },
      conversion: {
        ctaButtons: [],
        ctaCount: 0
      }
    };

    $("script[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http://")) {
        results.security.insecureScripts.push(src);
      }

      const hasAsyncOrDefer = $(el).attr("async") || $(el).attr("defer");
      if (!hasAsyncOrDefer) {
        results.performance.blockingScripts.push(src);
      }
    });

    $("iframe").each((_, el) => {
      const src = $(el).attr("src");
      if (src) results.security.iframes.push(src);
    });

    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http")) {
        results.performance.largeImages.push(src);
      }
    });

    $("link[rel='stylesheet']").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("http")) {
        results.performance.blockingCSS.push(href);
      }
    });

    const ctaKeywords = ["buy", "start", "get", "book", "order", "apply", "check", "claim"];
    $("button, a").each((_, el) => {
      const text = ($(el).text() || "").toLowerCase();
      if (ctaKeywords.some(keyword => text.includes(keyword))) {
        results.conversion.ctaButtons.push(text.trim());
      }
    });
    results.conversion.ctaCount = results.conversion.ctaButtons.length;

    reply.send(results);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
});

fastify.listen({ port: 5050, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Fastify server running at ${address}`);
});
