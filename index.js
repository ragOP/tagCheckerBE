const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = 5050;

app.use(cors());
app.options("*", cors());
app.use(express.json());

app.post("/check", async (req, res) => {
  console.log("✅ Request received from frontend");
  const url = req.body.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
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

    $("head script").each((_, el) => {
      const script = $(el).html();
      if (script && script.includes("googletagmanager.com/gtm.js")) {
        results.googleTagManager.head = true;
        results.googleTagManager.headCode = script.trim();
      }
    });

    $("body noscript").each((_, el) => {
      const noscript = $(el).html();
      if (noscript && noscript.includes("googletagmanager.com/ns.html")) {
        results.googleTagManager.body = true;
        results.googleTagManager.bodyCode = noscript.trim();
      }
    });

    $("script").each((_, el) => {
      const script = $(el).html();
      if (script && script.includes("ringba.com")) {
        results.ringba.present = true;
        results.ringba.snippet = script.trim();
      }
    });

    $("a[href^='tel:']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) results.telDIDs.push(href);
    });

    return res.json(results);
  } catch (err) {
    console.error("❌ Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
