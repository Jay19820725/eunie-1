import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { WORDS, IMAGES } from "./src/core/cards.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Database setup with robust fallback for empty env vars
  const rawDbUrl = process.env.DATABASE_URL;
  const isValidDbUrl = (url: string | undefined): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === "" || url === "undefined" || url === "null") return false;
    try {
      // Basic check for protocol
      if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) return false;
      // Try parsing it
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const connectionString = isValidDbUrl(rawDbUrl) 
    ? rawDbUrl! 
    : "postgresql://root:sy9aLY7vAHcEfji2U5b0R6n348kQV1NK@tpe1.clusters.zeabur.com:23833/zeabur";

  console.log("Using database connection string (masked):", connectionString.replace(/:[^:@]+@/, ":****@"));

  const pool = new Pool({
    connectionString,
    ssl: false, // Reverted: The server does not support SSL connections
    connectionTimeoutMillis: 10000, // 10 seconds timeout
  });

  // Initialize database tables in background
  initializeDatabase(pool).catch(err => console.error("Database initialization background error:", err));

  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  app.use(cors());
  app.use(express.json());

  // Request logging for debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // Dynamic Meta Injection Middleware for SEO
  app.get(["/", "/report/:id"], async (req, res, next) => {
    const userAgent = req.headers["user-agent"] || "";
    const isCrawler = /facebookexternalhit|line-poker|Twitterbot|googlebot|bingbot|linkedinbot/i.test(userAgent);

    if (!isCrawler) {
      return next();
    }

    try {
      let title = "EUNIE 嶼妳 | 懂妳的能量，平衡妳的生活";
      let description = "透過五行能量卡片，探索內在自我，獲得每日心靈指引與能量平衡。";
      let ogImage = "https://picsum.photos/seed/lumina-og/1200/630";
      const url = `${process.env.APP_URL || 'https://' + req.get('host')}${req.originalUrl}`;

      // Language detection for SEO
      let seoLang = 'zh';
      if (req.params.id) {
        const langResult = await pool.query("SELECT lang FROM energy_reports WHERE id = $1", [req.params.id]);
        if (langResult.rows.length > 0) {
          seoLang = langResult.rows[0].lang || 'zh';
        }
      }

      const seoTranslations: Record<string, { title: string, description: string }> = {
        zh: {
          title: "EUNIE 嶼妳 | 懂妳的能量，平衡妳的生活",
          description: "透過五行能量卡片，探索內在自我，獲得每日心靈指引與能量平衡。"
        },
        ja: {
          title: "EUNIE | あなたのエネルギーを理解し、生活を整える",
          description: "五行エネルギーカードを通じて内なる自己を探索し、日々の心の指引とエネルギーバランスを得る。"
        }
      };

      if (seoLang === 'ja') {
        title = seoTranslations.ja.title;
        description = seoTranslations.ja.description;
      }

      // Fetch global SEO settings
      const seoResult = await pool.query("SELECT value FROM site_settings WHERE key = 'seo'");
      if (seoResult.rows.length > 0) {
        const seo = seoResult.rows[0].value;
        title = seo.title || title;
        description = seo.description || description;
        ogImage = seo.og_image || ogImage;
      }

      // If it's a report page, fetch report-specific data
      if (req.params.id) {
        const reportResult = await pool.query("SELECT * FROM energy_reports WHERE id = $1", [req.params.id]);
        if (reportResult.rows.length > 0) {
          const report = reportResult.rows[0];
          title = report.today_theme || title;
          // Use selected thumbnail if available, otherwise use dominant element image or default
          ogImage = report.share_thumbnail || ogImage;
          
          // Language-aware description
          const reportLang = report.lang || 'zh';
          const elementMap: Record<string, Record<string, string>> = {
            zh: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水', none: '平衡' },
            ja: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水', none: 'バランス' }
          };
          const dominant = (report.dominant_element || 'none').toLowerCase();
          const translatedElement = elementMap[reportLang as 'zh' | 'ja']?.[dominant] || report.dominant_element;

          if (reportLang === 'ja') {
            description = `EUNIEでのエネルギー分析結果です。主要な要素：${translatedElement}。`;
            if (!report.today_theme) {
              title = seoTranslations.ja.title;
            }
          } else {
            description = `這是我在 EUNIE 的能量剖析結果。主導元素：${translatedElement}。`;
            if (!report.today_theme) {
              title = seoTranslations.zh.title;
            }
          }
        }
      }

      const html = `
        <!DOCTYPE html>
        <html lang="${seoLang === 'ja' ? 'ja' : 'zh-TW'}">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <meta name="description" content="${description}">
          
          <!-- Open Graph / Facebook / LINE -->
          <meta property="og:type" content="website">
          <meta property="og:url" content="${url}">
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:image" content="${ogImage}">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">

          <!-- Twitter -->
          <meta property="twitter:card" content="summary_large_image">
          <meta property="twitter:url" content="${url}">
          <meta property="twitter:title" content="${title}">
          <meta property="twitter:description" content="${description}">
          <meta property="twitter:image" content="${ogImage}">

          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script type="text/javascript">
            window.location.href = "${req.originalUrl}";
          </script>
        </head>
        <body>
          <h1>${title}</h1>
          <p>${description}</p>
          <img src="${ogImage}" alt="Preview Image">
        </body>
        </html>
      `;
      res.send(html);
    } catch (err) {
      console.error("SEO Injection Error:", err);
      next();
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // User API
  app.get(["/api/users/:uid", "/api/users/:uid/"], async (req, res) => {
    const { uid } = req.params;
    try {
      const result = await pool.query("SELECT * FROM users WHERE uid = $1", [uid]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post(["/api/users", "/api/users/"], async (req, res) => {
    const { uid, email, displayName, photoURL, role, subscription_status, points, subscription_tier, is_first_purchase } = req.body;
    console.log("POST /api/users - Body:", req.body);
    try {
      const result = await pool.query(
        `INSERT INTO users (uid, email, display_name, photo_url, role, subscription_status, points, subscription_tier, is_first_purchase) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         ON CONFLICT (uid) DO UPDATE SET 
           email = EXCLUDED.email, 
           display_name = COALESCE(EXCLUDED.display_name, users.display_name),
           photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
           last_login = CURRENT_TIMESTAMP 
         RETURNING *`,
        [
          uid, 
          email, 
          displayName, 
          photoURL, 
          role || 'free_member', 
          subscription_status || 'none',
          points !== undefined ? points : 0,
          subscription_tier || 'none',
          is_first_purchase !== undefined ? is_first_purchase : true
        ]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating/updating user:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/:uid/points", async (req, res) => {
    const { uid } = req.params;
    try {
      const result = await pool.query(
        "SELECT points, subscription_status, subscription_tier, subscription_expiry, is_first_purchase FROM users WHERE uid = $1",
        [uid]
      );
      if (result.rows.length === 0) {
        return res.json({ points: 0, subscription_status: 'none', is_first_purchase: true });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching user points:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/payments/simulate", async (req, res) => {
    const { userId, type, amount, currency } = req.body;
    try {
      if (type === 'subscription') {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);
        await pool.query(
          `UPDATE users SET 
            subscription_status = 'active', 
            subscription_tier = 'premium', 
            subscription_expiry = $1, 
            points = 15,
            is_first_purchase = FALSE
           WHERE uid = $2`,
          [expiry, userId]
        );
      } else if (type === 'points_pack') {
        await pool.query(
          "UPDATE users SET points = points + 15, is_first_purchase = FALSE WHERE uid = $1",
          [userId]
        );
      } else if (type === 'trial_point') {
        await pool.query(
          "UPDATE users SET points = points + 1, is_first_purchase = FALSE WHERE uid = $1",
          [userId]
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error simulating payment:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/reports/consume-points", async (req, res) => {
    const { userId } = req.body;
    try {
      const userResult = await pool.query("SELECT points FROM users WHERE uid = $1", [userId]);
      if (userResult.rows.length === 0 || userResult.rows[0].points <= 0) {
        return res.status(403).json({ error: "Insufficient points" });
      }
      await pool.query("UPDATE users SET points = points - 1 WHERE uid = $1", [userId]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error consuming points:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch(["/api/users/:uid", "/api/users/:uid/"], async (req, res) => {
    const { uid } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates);
    
    console.log(`PATCH /api/users/${uid} - Updates:`, updates);
    
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    const setClause = fields.map((f, i) => {
      const colName = f === 'displayName' ? 'display_name' : f === 'photoURL' ? 'photo_url' : f;
      return `${colName} = $${i + 2}`;
    }).join(", ");
    
    const values = [uid, ...Object.values(updates)];

    try {
      const result = await pool.query(
        `UPDATE users SET ${setClause} WHERE uid = $1 RETURNING *`, 
        values
      );
      
      if (result.rowCount === 0) {
        console.warn(`User with uid ${uid} not found for update`);
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log(`User ${uid} updated successfully:`, result.rows[0]);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Subscription API
  app.post("/api/subscription/trial", async (req, res) => {
    const { userId } = req.body;
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days trial
      
      const result = await pool.query(
        `UPDATE users SET 
          subscription_status = 'trialing',
          subscription_tier = 'premium',
          subscription_type = 'monthly',
          subscription_expiry = $1,
          trial_start_date = CURRENT_TIMESTAMP
         WHERE uid = $2 RETURNING *`,
        [expiryDate.toISOString(), userId]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error starting trial:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/subscription/update", async (req, res) => {
    const { userId, tier, type, status, durationMonths } = req.body;
    try {
      let expiryDate = null;
      if (status === 'active') {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + (durationMonths || 1));
      }
      
      const result = await pool.query(
        `UPDATE users SET 
          subscription_status = $1,
          subscription_tier = $2,
          subscription_type = $3,
          subscription_expiry = $4
         WHERE uid = $5 RETURNING *`,
        [status, tier, type, expiryDate ? expiryDate.toISOString() : null, userId]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating subscription:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Journal API
  app.post("/api/journal", async (req, res) => {
    const { user_id, emotion_tag, insight, intention } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO energy_journal (user_id, emotion_tag, insight, intention) VALUES ($1, $2, $3, $4) RETURNING id",
        [user_id, emotion_tag, insight, intention]
      );
      res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
      console.error("Error adding journal entry:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/journal/:userId", async (req, res) => {
    const { userId } = req.params;
    const limit = req.query.limit || 50;
    try {
      const result = await pool.query(
        "SELECT * FROM energy_journal WHERE user_id = $1 ORDER BY date DESC LIMIT $2",
        [userId, limit]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching journal entries:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/journal/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM energy_journal WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting journal entry:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Sessions API
  app.post("/api/sessions", async (req, res) => {
    const { user_id, image_cards, word_cards } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO sessions (user_id, image_cards, word_cards) VALUES ($1, $2, $3) RETURNING id",
        [user_id, JSON.stringify(image_cards), JSON.stringify(word_cards)]
      );
      res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
      console.error("Error creating session:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/sessions/:id", async (req, res) => {
    const { id } = req.params;
    const { pairs, association_text } = req.body;
    try {
      await pool.query(
        "UPDATE sessions SET pairs = $1, association_text = $2 WHERE id = $3",
        [JSON.stringify(pairs), JSON.stringify(association_text), id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating session:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Cards API
  app.get("/api/cards/image", async (req, res) => {
    const { locale } = req.query;
    try {
      let query = "SELECT * FROM cards_image";
      const params = [];
      if (locale) {
        query += " WHERE locale = $1";
        params.push(locale);
      }
      query += " ORDER BY id ASC";
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching image cards:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/cards/word", async (req, res) => {
    const { locale } = req.query;
    try {
      let query = "SELECT * FROM cards_word";
      const params = [];
      if (locale) {
        query += " WHERE locale = $1";
        params.push(locale);
      }
      query += " ORDER BY id ASC";
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching word cards:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Manifestations API
  app.get("/api/manifestations/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const result = await pool.query(
        "SELECT * FROM manifestations WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching manifestations:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/manifestations", async (req, res) => {
    const { user_id, wish_title, deadline, deadline_option } = req.body;
    try {
      // Check limit
      const countResult = await pool.query(
        "SELECT count(*) FROM manifestations WHERE user_id = $1 AND status = 'active'",
        [user_id]
      );
      if (parseInt(countResult.rows[0].count) >= 3) {
        return res.status(400).json({ error: "Maximum 3 active wishes allowed" });
      }

      const result = await pool.query(
        "INSERT INTO manifestations (user_id, wish_title, deadline, deadline_option) VALUES ($1, $2, $3, $4) RETURNING id",
        [user_id, wish_title, deadline, deadline_option]
      );
      res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
      console.error("Error creating manifestation:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/manifestations/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const values = [id, ...Object.values(updates)];

    try {
      await pool.query(`UPDATE manifestations SET ${setClause} WHERE id = $1`, values);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating manifestation:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/report/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`[API] GET /api/report/${id}`);
    try {
      const result = await pool.query("SELECT * FROM energy_reports WHERE id = $1", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      const row = result.rows[0];
      const data = row.report_data || {};
      
      // Flatten the structure for the frontend
      const mappedReport = {
        id: row.id,
        userId: row.user_id,
        timestamp: new Date(row.timestamp).getTime(),
        isAiComplete: row.is_ai_complete,
        dominantElement: row.dominant_element,
        weakElement: row.weak_element,
        balanceScore: row.balance_score,
        todayTheme: row.today_theme,
        shareThumbnail: row.share_thumbnail,
        multilingualContent: data.multilingualContent || {},
        ...data
      };
      
      res.json(mappedReport);
    } catch (err) {
      console.error("Error fetching single report:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/:uid/daily-status", async (req, res) => {
    const { uid } = req.params;
    try {
      // 1. Check if completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayResult = await pool.query(
        "SELECT id, today_theme FROM energy_reports WHERE user_id = $1 AND timestamp >= $2 ORDER BY timestamp DESC LIMIT 1",
        [uid, today]
      );
      
      const isCompletedToday = todayResult.rows.length > 0 && !!todayResult.rows[0].today_theme;
      
      // 2. Calculate streak
      const reportsResult = await pool.query(
        "SELECT DISTINCT DATE(timestamp) as report_date FROM energy_reports WHERE user_id = $1 ORDER BY report_date DESC",
        [uid]
      );
      
      let streak = 0;
      if (reportsResult.rows.length > 0) {
        const dates = reportsResult.rows.map(r => {
          const d = new Date(r.report_date);
          d.setHours(0, 0, 0, 0);
          return d;
        });
        
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        // If today is not in the list, check if yesterday is
        const todayStr = checkDate.toISOString().split('T')[0];
        const hasToday = dates.some(d => d.toISOString().split('T')[0] === todayStr);
        
        if (!hasToday) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        
        for (let i = 0; i < dates.length; i++) {
          const dateStr = dates[i].toISOString().split('T')[0];
          const checkStr = checkDate.toISOString().split('T')[0];
          
          if (dateStr === checkStr) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            // Check if we skipped a day
            if (dateStr < checkStr) break;
          }
        }
      }
      
      res.json({
        isCompletedToday,
        streak,
        lastReportId: todayResult.rows[0]?.id || null
      });
    } catch (err) {
      console.error("Error fetching daily status:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get(["/api/reports/:userId", "/api/reports/:userId/"], async (req, res) => {
    const { userId } = req.params;
    const { lang } = req.query;
    console.log(`[API] GET /api/reports/${userId} (lang: ${lang})`);
    try {
      // 1. Fetch reports for the requested language
      let query = "SELECT * FROM energy_reports WHERE user_id = $1";
      const params = [userId];
      
      if (typeof lang === 'string') {
        params.push(lang);
        query += ` AND lang = $${params.length}`;
      }
      
      query += " ORDER BY timestamp DESC";
      
      const result = await pool.query(query, params);
      
      const mappedReports = result.rows.map(row => {
        const data = row.report_data || {};
        return {
          id: row.id,
          userId: row.user_id,
          timestamp: new Date(row.timestamp).getTime(),
          isAiComplete: row.is_ai_complete,
          dominantElement: row.dominant_element,
          weakElement: row.weak_element,
          balanceScore: row.balance_score,
          todayTheme: row.today_theme,
          shareThumbnail: row.share_thumbnail,
          ...data
        };
      });

      // 2. Check if reports in other languages exist
      let otherLangCount = 0;
      if (lang) {
        const otherLangResult = await pool.query(
          "SELECT count(*) FROM energy_reports WHERE user_id = $1 AND lang != $2",
          [userId, lang]
        );
        otherLangCount = parseInt(otherLangResult.rows[0].count);
      }
      
      res.json({
        reports: mappedReports,
        hasOtherLang: otherLangCount > 0,
        otherLangCount
      });
    } catch (err) {
      console.error("Error fetching energy reports:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    const { 
      id, 
      userId, 
      lang,
      dominantElement, 
      weakElement, 
      balanceScore, 
      todayTheme,
      shareThumbnail,
      isAiComplete,
      ...otherData 
    } = req.body;

    console.log(`[API] POST /api/reports - Saving report: ${id || 'NEW'} for: ${userId || 'GUEST'} (lang: ${lang})`);

    try {
      // 1. Ensure user exists if userId is provided (Auto-Sync)
      if (userId) {
        await pool.query(
          "INSERT INTO users (uid, last_login) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (uid) DO UPDATE SET last_login = CURRENT_TIMESTAMP",
          [userId]
        );
      }

      // 2. UPSERT logic: Insert or Update if ID exists
      // If no ID provided, we let the database generate one
      let result;
      if (id) {
        result = await pool.query(
          `INSERT INTO energy_reports (
            id, user_id, lang, dominant_element, weak_element, balance_score, 
            today_theme, share_thumbnail, is_ai_complete, report_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            user_id = COALESCE(EXCLUDED.user_id, energy_reports.user_id),
            lang = COALESCE(EXCLUDED.lang, energy_reports.lang),
            dominant_element = COALESCE(EXCLUDED.dominant_element, energy_reports.dominant_element),
            weak_element = COALESCE(EXCLUDED.weak_element, energy_reports.weak_element),
            balance_score = COALESCE(EXCLUDED.balance_score, energy_reports.balance_score),
            today_theme = COALESCE(EXCLUDED.today_theme, energy_reports.today_theme),
            share_thumbnail = COALESCE(EXCLUDED.share_thumbnail, energy_reports.share_thumbnail),
            is_ai_complete = COALESCE(EXCLUDED.is_ai_complete, energy_reports.is_ai_complete),
            report_data = energy_reports.report_data || EXCLUDED.report_data
          RETURNING *`,
          [id, userId, lang || 'zh', dominantElement, weakElement, balanceScore, todayTheme, shareThumbnail, isAiComplete || false, JSON.stringify(otherData)]
        );
      } else {
        result = await pool.query(
          `INSERT INTO energy_reports (
            user_id, lang, dominant_element, weak_element, balance_score, 
            today_theme, share_thumbnail, is_ai_complete, report_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [userId, lang || 'zh', dominantElement, weakElement, balanceScore, todayTheme, shareThumbnail, isAiComplete || false, JSON.stringify(otherData)]
        );
      }
      
      if (result.rows.length === 0) {
        throw new Error("Failed to save or update report - no rows returned");
      }

      const row = result.rows[0];
      const data = row.report_data || {};
      res.json({
        id: row.id,
        userId: row.user_id,
        timestamp: new Date(row.timestamp).getTime(),
        isAiComplete: row.is_ai_complete,
        dominantElement: row.dominant_element,
        weakElement: row.weak_element,
        balanceScore: row.balance_score,
        todayTheme: row.today_theme,
        shareThumbnail: row.share_thumbnail,
        ...data
      });
    } catch (err) {
      console.error("[API] Error saving energy report:", err);
      res.status(500).json({ 
        error: "Internal server error", 
        details: String(err),
        message: "Failed to save energy report. Please check server logs."
      });
    }
  });

  app.post("/api/reports/:id/share", async (req, res) => {
    const { id } = req.params;
    const { shareThumbnail } = req.body;
    try {
      await pool.query(
        "UPDATE energy_reports SET share_thumbnail = $1 WHERE id = $2",
        [shareThumbnail, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating share thumbnail:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  // Ocean of Resonance API
  app.get("/api/bottles/tags", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM bottle_tags ORDER BY created_at ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching bottle tags:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bottles", async (req, res) => {
    const { userId, content, element, lang, originLocale, cardId, quote, reportId, nickname, cardImageUrl, cardName } = req.body;
    
    try {
      // 1. Check if user has at least one report
      const reportsCount = await pool.query("SELECT COUNT(*) FROM energy_reports WHERE user_id = $1", [userId]);
      if (parseInt(reportsCount.rows[0].count) === 0) {
        return res.status(403).json({ error: "You must complete at least one energy test to create a bottle mail." });
      }

      // 2. Check Premium Status
      const userResult = await pool.query("SELECT role, subscription_status FROM users WHERE uid = $1", [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = userResult.rows[0];
      const isPremium = user.role === 'admin' || user.role === 'premium_member' || user.subscription_status === 'active';
      
      if (!isPremium) {
        return res.status(403).json({ error: "Premium membership required to cast a bottle." });
      }

      // 3. Update default nickname if provided
      if (nickname) {
        await pool.query("UPDATE users SET default_bottle_nickname = $1 WHERE uid = $2", [nickname, userId]);
      }

      // 4. Sensitive Word Filter (Direct Rejection)
      const sensitiveWordsResult = await pool.query("SELECT word FROM sensitive_words");
      const sensitiveWords = sensitiveWordsResult.rows.map(r => r.word);
      
      for (const word of sensitiveWords) {
        if (content.includes(word)) {
          return res.status(400).json({ 
            error: "Content contains sensitive words.", 
            code: "SENSITIVE_CONTENT" 
          });
        }
      }

      // 5. Save Bottle
      const { energyColorTag } = req.body;
      const result = await pool.query(
        "INSERT INTO bottles (user_id, content, element, lang, origin_locale, card_id, quote, report_id, sender_nickname, card_image_url, card_name_saved, energy_color_tag) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
        [userId, content, element, lang, originLocale, cardId, quote, reportId, nickname, cardImageUrl, cardName, energyColorTag]
      );
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error casting bottle:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/bottles/random", async (req, res) => {
    const { userId, targetLang } = req.query;
    try {
      // Pick a random bottle that is active and not from the current user
      const result = await pool.query(
        `SELECT b.*, 
                COALESCE(b.sender_nickname, u.display_name) as sender_name,
                COALESCE(b.card_image_url, ci.image_url, cw.image_url) as card_image,
                COALESCE(b.card_name_saved, ci.name, cw.name) as card_name,
                er.report_data,
                (SELECT COUNT(*) FROM bottle_blessings WHERE bottle_id = b.id) as blessing_count
         FROM bottles b 
         JOIN users u ON b.user_id = u.uid 
         LEFT JOIN cards_image ci ON b.card_id = ci.id
         LEFT JOIN cards_word cw ON b.card_id = cw.id
         LEFT JOIN energy_reports er ON b.report_id = er.id
         WHERE b.is_active = TRUE AND b.user_id != $1 
         ORDER BY RANDOM() LIMIT 1`,
        [userId || '']
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No bottles found in the ocean." });
      }
      
      const bottle = result.rows[0];

      // Increment view count asynchronously
      pool.query("UPDATE bottles SET view_count = view_count + 1 WHERE id = $1", [bottle.id]).catch(err => {
        console.error("Error incrementing bottle view count:", err);
      });
      
      // Translation logic using Gemini
      if (targetLang && bottle.lang !== targetLang && process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const model = "gemini-3-flash-preview";
          const prompt = `Translate the following message from ${bottle.lang} to ${targetLang}. Only return the translated text.
          Message: ${bottle.content}`;
          
          const aiResponse = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }]
          });
          
          bottle.translatedContent = aiResponse.text;
        } catch (aiErr) {
          console.error("AI Translation error:", aiErr);
          // Fallback: don't include translatedContent if AI fails
        }
      }
      
      res.json(bottle);
    } catch (err) {
      console.error("Error picking up bottle:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bottles/:id/bless", async (req, res) => {
    const { id } = req.params;
    const { userId, tagId } = req.body;
    try {
      await pool.query(
        "INSERT INTO bottle_blessings (bottle_id, user_id, tag_id) VALUES ($1, $2, $3)",
        [id, userId, tagId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error blessing bottle:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bottles/:id/hug", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "UPDATE bottles SET hug_count = hug_count + 1 WHERE id = $1 RETURNING hug_count",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Bottle not found" });
      }
      res.json({ success: true, hugCount: result.rows[0].hug_count });
    } catch (err) {
      console.error("Error hugging bottle:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/bottles/my/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const result = await pool.query(
        `SELECT b.*, 
                COALESCE(b.card_image_url, ci.image_url, cw.image_url) as card_image,
                COALESCE(b.card_name_saved, ci.name, cw.name) as card_name,
                er.report_data,
                (SELECT COUNT(*) FROM bottle_blessings WHERE bottle_id = b.id) as blessing_count,
                (SELECT MAX(created_at) FROM bottle_blessings WHERE bottle_id = b.id) as last_blessing_at
         FROM bottles b 
         LEFT JOIN cards_image ci ON b.card_id = ci.id
         LEFT JOIN cards_word cw ON b.card_id = cw.id
         LEFT JOIN energy_reports er ON b.report_id = er.id
         WHERE b.user_id = $1 
         ORDER BY b.created_at DESC`,
        [userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching user's bottles:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bottles/:id/mark-read", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query(
        "UPDATE bottles SET last_checked_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking bottle as read:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Saved Bottles API
  app.get("/api/bottles/saved/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const result = await pool.query(
        `SELECT sb.id as saved_id, sb.reply_message, sb.saved_at,
                b.*, 
                COALESCE(b.card_image_url, ci.image_url, cw.image_url) as card_image,
                COALESCE(b.card_name_saved, ci.name, cw.name) as card_name,
                er.report_data
         FROM saved_bottles sb
         JOIN bottles b ON sb.bottle_id = b.id
         LEFT JOIN cards_image ci ON b.card_id = ci.id
         LEFT JOIN cards_word cw ON b.card_id = cw.id
         LEFT JOIN energy_reports er ON b.report_id = er.id
         WHERE sb.user_id = $1 
         ORDER BY sb.saved_at DESC`,
        [userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching saved bottles:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bottles/:id/save", async (req, res) => {
    const { id } = req.params;
    const { userId, replyMessage } = req.body;
    try {
      // Check limit (20)
      const countResult = await pool.query("SELECT COUNT(*) FROM saved_bottles WHERE user_id = $1", [userId]);
      if (parseInt(countResult.rows[0].count) >= 20) {
        return res.status(400).json({ 
          error: "You have reached the maximum limit of 20 saved bottles.",
          code: "LIMIT_EXCEEDED"
        });
      }

      await pool.query(
        `INSERT INTO saved_bottles (user_id, bottle_id, reply_message) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, bottle_id) DO UPDATE SET reply_message = EXCLUDED.reply_message`,
        [userId, id, replyMessage]
      );

      // If there's a reply message, also add it to bottle_replies for the author
      if (replyMessage && replyMessage.trim()) {
        await pool.query(
          "INSERT INTO bottle_replies (bottle_id, sender_id, content) VALUES ($1, $2, $3)",
          [id, userId, replyMessage]
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error saving bottle:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/bottles/saved/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM saved_bottles WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting saved bottle:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/bottles/:id/replies", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT br.*, u.display_name as sender_name, u.photo_url as sender_photo
         FROM bottle_replies br
         JOIN users u ON br.sender_id = u.uid
         WHERE br.bottle_id = $1
         ORDER BY br.created_at DESC`,
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching bottle replies:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dauResult = await pool.query("SELECT count(*) FROM users WHERE last_login >= $1", [today]);
      const sessionsResult = await pool.query("SELECT count(*) FROM sessions WHERE session_time >= $1", [today]);
      const newUsersResult = await pool.query("SELECT count(*) FROM users WHERE register_date >= $1", [today]);
      const premiumResult = await pool.query("SELECT count(*) FROM users WHERE subscription_status = 'active'");

      res.json({
        dau: parseInt(dauResult.rows[0].count),
        dailySessions: parseInt(sessionsResult.rows[0].count),
        newUsers: parseInt(newUsersResult.rows[0].count),
        premiumSubscriptions: parseInt(premiumResult.rows[0].count)
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    const limit = req.query.limit || 50;
    try {
      const result = await pool.query("SELECT * FROM users ORDER BY register_date DESC LIMIT $1", [limit]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching all users:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/sessions", async (req, res) => {
    const limit = req.query.limit || 50;
    try {
      const result = await pool.query("SELECT * FROM sessions ORDER BY session_time DESC LIMIT $1", [limit]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching all sessions:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/sessions/drafts", async (req, res) => {
    try {
      const result = await pool.query(
        "DELETE FROM sessions WHERE pairs = '[]' OR pairs IS NULL"
      );
      res.json({ success: true, count: result.rowCount });
    } catch (err) {
      console.error("Error deleting session drafts:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/cards/image", async (req, res) => {
    const { id, image_url, description, elements, locale, name_en, name } = req.body;
    try {
      await pool.query(
        `INSERT INTO cards_image (id, image_url, description, elements, locale, name_en, name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         ON CONFLICT (id) DO UPDATE SET 
           image_url = EXCLUDED.image_url, 
           description = EXCLUDED.description, 
           elements = EXCLUDED.elements,
           locale = EXCLUDED.locale,
           name_en = EXCLUDED.name_en,
           name = EXCLUDED.name`,
        [id, image_url, description, JSON.stringify(elements), locale || 'zh-TW', name_en, name]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving image card:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/cards/image/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM cards_image WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting image card:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/cards/word", async (req, res) => {
    const { id, text, image_url, description, elements, locale, name_en, name } = req.body;
    try {
      await pool.query(
        `INSERT INTO cards_word (id, text, image_url, description, elements, locale, name_en, name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT (id) DO UPDATE SET 
           text = EXCLUDED.text, 
           image_url = EXCLUDED.image_url, 
           description = EXCLUDED.description, 
           elements = EXCLUDED.elements,
           locale = EXCLUDED.locale,
           name_en = EXCLUDED.name_en,
           name = EXCLUDED.name`,
        [id, text, image_url, description, JSON.stringify(elements), locale || 'zh-TW', name_en, name]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving word card:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/cards/word/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM cards_word WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting word card:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/subscriptions", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE subscription_status != 'none' ORDER BY subscription_status, register_date DESC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin Report Management
  app.get("/api/admin/reports", async (req, res) => {
    const { email, limit = 50, offset = 0 } = req.query;
    try {
      let query = `
        SELECT r.*, u.email as user_email, u.display_name as user_name 
        FROM energy_reports r
        LEFT JOIN users u ON r.user_id = u.uid
      `;
      const values: any[] = [];
      
      if (email) {
        query += " WHERE u.email ILIKE $1";
        values.push(`%${email}%`);
      }
      
      const countQuery = `SELECT count(*) FROM (${query}) as total`;
      const totalResult = await pool.query(countQuery, values);
      const total = parseInt(totalResult.rows[0].count);

      query += ` ORDER BY r.timestamp DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      res.json({ reports: result.rows, total });
    } catch (err) {
      console.error("Error fetching admin reports:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/reports/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM energy_reports WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting admin report:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/reports", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid IDs" });
    }
    try {
      await pool.query("DELETE FROM energy_reports WHERE id = ANY($1)", [ids]);
      res.status(204).send();
    } catch (err) {
      console.error("Error batch deleting admin reports:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/prompts", async (req, res) => {
    const { category, status } = req.query;
    try {
      let query = "SELECT * FROM ai_prompts";
      const params = [];
      if (category || status) {
        query += " WHERE";
        if (category) {
          params.push(category);
          query += ` category = $${params.length}`;
        }
        if (status) {
          if (params.length > 0) query += " AND";
          params.push(status);
          query += ` status = $${params.length}`;
        }
      }
      query += " ORDER BY module_name ASC, created_at DESC";
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching prompts:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/prompts", async (req, res) => {
    const { id, module_name, content_zh, content_ja, status, version, category } = req.body;
    try {
      if (id) {
        await pool.query(
          "UPDATE ai_prompts SET module_name = $1, content_zh = $2, content_ja = $3, status = $4, version = $5, category = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7",
          [module_name, content_zh, content_ja, status, version, category, id]
        );
      } else {
        await pool.query(
          "INSERT INTO ai_prompts (module_name, content_zh, content_ja, status, version, category) VALUES ($1, $2, $3, $4, $5, $6)",
          [module_name, content_zh, content_ja, status, version, category]
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving prompt:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/prompts/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM ai_prompts WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting prompt:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/prompts/:id/activate", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("UPDATE ai_prompts SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error activating prompt:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Music Management APIs
  app.get("/api/music", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM music_tracks WHERE is_active = TRUE ORDER BY sort_order ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching music:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/music", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM music_tracks ORDER BY sort_order ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching admin music:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/music", async (req, res) => {
    const { name, title, artist, category, element, url, is_active, sort_order } = req.body;
    
    console.log(`[Admin] Saving music track: ${name} (${url})`);
    
    // Basic validation
    if (!url) {
      return res.status(400).json({ error: "音檔 URL 是必填的" });
    }

    // Ensure sort_order is a valid integer
    const parsedSortOrder = parseInt(sort_order);
    const safeSortOrder = isNaN(parsedSortOrder) ? 0 : parsedSortOrder;

    try {
      // Use UPSERT logic based on URL to allow overwriting
      const result = await pool.query(
        `INSERT INTO music_tracks (name, title, artist, category, element, url, is_active, sort_order) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT (url) DO UPDATE SET 
           name = EXCLUDED.name, 
           title = EXCLUDED.title, 
           artist = EXCLUDED.artist, 
           category = EXCLUDED.category, 
           element = EXCLUDED.element, 
           is_active = EXCLUDED.is_active, 
           sort_order = EXCLUDED.sort_order
         RETURNING *`,
        [name, title, artist, category, element, url, is_active, safeSortOrder]
      );
      
      console.log(`[Admin] Successfully saved music track. ID: ${result.rows[0].id}`);
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error("[Admin] Error saving music track:", err);
      res.status(500).json({ 
        error: "Internal server error", 
        details: err.message,
        code: err.code
      });
    }
  });

  app.delete("/api/admin/music/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM music_tracks WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting music track:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Ocean of Resonance Management
  app.get("/api/admin/bottles", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    try {
      const totalResult = await pool.query("SELECT COUNT(*) FROM bottles");
      const result = await pool.query(`
        SELECT b.*, u.display_name, u.email 
        FROM bottles b 
        JOIN users u ON b.user_id = u.uid 
        ORDER BY b.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      res.json({
        bottles: result.rows,
        total: parseInt(totalResult.rows[0].count)
      });
    } catch (err) {
      console.error("Error fetching admin bottles:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/bottles/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM bottles WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting bottle:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/bottles/tags", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM bottle_tags ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching admin bottle tags:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/bottles/tags", async (req, res) => {
    const { id, name_zh, name_ja, color, category } = req.body;
    try {
      if (id) {
        await pool.query(
          "UPDATE bottle_tags SET name_zh = $1, name_ja = $2, color = $3, category = $4 WHERE id = $5",
          [name_zh, name_ja, color, category || 'blessing', id]
        );
      } else {
        await pool.query(
          "INSERT INTO bottle_tags (name_zh, name_ja, color, category) VALUES ($1, $2, $3, $4)",
          [name_zh, name_ja, color, category || 'blessing']
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving bottle tag:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/bottles/tags/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM bottle_tags WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting bottle tag:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Sensitive Words API
  app.get("/api/admin/sensitive-words", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM sensitive_words ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching sensitive words:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/sensitive-words", async (req, res) => {
    const { id, word, category } = req.body;
    try {
      if (id) {
        await pool.query(
          "UPDATE sensitive_words SET word = $1, category = $2 WHERE id = $3",
          [word, category || 'general', id]
        );
      } else {
        await pool.query(
          "INSERT INTO sensitive_words (word, category) VALUES ($1, $2)",
          [word, category || 'general']
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving sensitive word:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/sensitive-words/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM sensitive_words WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting sensitive word:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/prompts/active", async (req, res) => {
    const { lang } = req.query;
    const language = lang === 'ja' ? 'ja' : 'zh';
    try {
      // Fetch all active modules
      const result = await pool.query(
        "SELECT module_name, content_zh, content_ja FROM ai_prompts WHERE status = 'active' ORDER BY category ASC, module_name ASC"
      );
      
      if (result.rows.length > 0) {
        // Stitch them together
        const fullPrompt = result.rows.map(row => {
          return language === 'ja' ? row.content_ja : row.content_zh;
        }).join("\n\n");
        
        res.json({ content: fullPrompt });
      } else {
        res.json({ content: "" });
      }
    } catch (err) {
      console.error("Error fetching active prompt:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const usersResult = await pool.query("SELECT * FROM users");
      const sessionsResult = await pool.query("SELECT * FROM sessions WHERE session_time >= $1", [thirtyDaysAgo]);
      const journalsResult = await pool.query("SELECT * FROM energy_journal");

      const allUsers = usersResult.rows;
      const allSessions = sessionsResult.rows;
      const allJournals = journalsResult.rows;

      // Group by date helper
      const groupByDate = (data: any[], dateField: string, days: number) => {
        const result: Record<string, number> = {};
        for (let i = 0; i < days; i++) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().split('T')[0];
          result[dateStr] = 0;
        }
        data.forEach(item => {
          const date = new Date(item[dateField]);
          const dateStr = date.toISOString().split('T')[0];
          if (result[dateStr] !== undefined) result[dateStr]++;
        });
        return Object.entries(result)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));
      };

      const dauTrend30 = groupByDate(allUsers.filter(u => u.last_login), 'last_login', 30);
      const sessionsTrend30 = groupByDate(allSessions, 'session_time', 30);

      const emotionCounts: Record<string, number> = {};
      allJournals.forEach(j => {
        const emotion = j.emotion_tag || 'unknown';
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });

      const totalUsers = allUsers.length;
      const premiumUsers = allUsers.filter(u => u.subscription_status === 'active').length;
      const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;

      const sessionStarted = new Set(allSessions.map(s => s.user_id)).size;
      const sessionCompleted = new Set(allSessions.filter(s => s.pairs && s.pairs.length > 0).map(s => s.user_id)).size;

      res.json({
        metrics: {
          dau: allUsers.filter(u => new Date(u.last_login).toDateString() === now.toDateString()).length,
          totalSessions: allSessions.length,
          premiumConversion: conversionRate.toFixed(1) + '%',
          totalUsers
        },
        trends: {
          sevenDays: dauTrend30.slice(-7).map((d, i) => ({
            date: d.date,
            dau: d.value,
            sessions: sessionsTrend30.slice(-7)[i].value
          })),
          thirtyDays: dauTrend30.map((d, i) => ({
            date: d.date,
            dau: d.value,
            sessions: sessionsTrend30[i].value
          }))
        },
        emotionDistribution: Object.entries(emotionCounts).map(([name, value]) => ({ name, value })),
        funnelData: [
          { name: '註冊用戶', value: totalUsers, fill: '#8BA889' },
          { name: '開始抽卡', value: sessionStarted, fill: '#C4B08B' },
          { name: '完成抽卡', value: sessionCompleted, fill: '#D98B73' },
          { name: '付費會員', value: premiumUsers, fill: '#6B7B8C' },
        ]
      });
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Settings API
  app.get("/api/settings/:key", async (req, res) => {
    const { key } = req.params;
    try {
      const result = await pool.query("SELECT value FROM site_settings WHERE key = $1", [key]);
      if (result.rowCount === 0) {
        // Provide defaults for known keys
        if (key === 'seo') {
          return res.json({
            title: "EUNIE 嶼妳 | 懂妳的能量，平衡妳的生活",
            description: "透過五行能量卡片，探索內在自我，獲得每日心靈指引與能量平衡。",
            keywords: "能量卡片, 五行, 心靈導引, 冥想, 自我探索",
            og_image: "https://picsum.photos/seed/lumina-og/1200/630",
            google_analytics_id: "",
            search_console_id: "",
            index_enabled: true
          });
        }
        if (key === 'fonts') {
          return res.json({
            zh: {
              display: { url: "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700&display=swap", family: "\"Noto Serif TC\", serif" },
              body: { url: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500&display=swap", family: "\"Noto Sans TC\", sans-serif" }
            },
            ja: {
              display: { url: "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&display=swap", family: "\"Shippori Mincho\", serif" },
              body: { url: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500&display=swap", family: "\"Noto Sans JP\", sans-serif" }
            }
          });
        }
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(result.rows[0].value);
    } catch (err) {
      console.error(`Error fetching settings ${key}:`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/settings/:key", async (req, res) => {
    const { key } = req.params;
    const value = req.body;
    try {
      await pool.query(
        "INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP",
        [key, JSON.stringify(value)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(`Error saving settings ${key}:`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production" || process.env.ZEABUR === "true";
  
  if (!isProduction) {
    console.log("Starting in development mode with Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to start Vite server, falling back to static serving:", err);
      serveStatic();
    }
  } else {
    console.log("Starting in production mode...");
    serveStatic();
  }

  function serveStatic() {
    const distPath = path.join(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      console.log(`Serving static files from: ${distPath}`);
      app.use(express.static(distPath));
      app.get(/.*/, (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn(`Static directory not found: ${distPath}. API routes only.`);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("Zeabur detected:", !!process.env.ZEABUR);
    console.log("Firebase API Key present:", !!process.env.VITE_FIREBASE_API_KEY);
    console.log("Gemini API Key present:", !!process.env.GEMINI_API_KEY);
  });
}

/**
 * Initializes database tables and seeds default data.
 * This runs in the background to ensure the server starts quickly.
 */
async function initializeDatabase(pool: pg.Pool) {
  console.log("Initializing database tables...");
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT,
        display_name TEXT,
        photo_url TEXT,
        role TEXT DEFAULT 'free_member',
        points INTEGER DEFAULT 0,
        subscription_status TEXT DEFAULT 'none',
        subscription_tier TEXT DEFAULT 'none',
        subscription_expiry TIMESTAMP,
        is_first_purchase BOOLEAN DEFAULT TRUE,
        default_bottle_nickname TEXT,
        register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to users if they don't exist
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'none';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_purchase BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS default_bottle_nickname TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // Energy Journal table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS energy_journal (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        emotion_tag TEXT,
        insight TEXT,
        intention TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to energy_journal if they don't exist
    await pool.query(`
      ALTER TABLE energy_journal ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(uid);
      ALTER TABLE energy_journal ADD COLUMN IF NOT EXISTS emotion_tag TEXT;
      ALTER TABLE energy_journal ADD COLUMN IF NOT EXISTS insight TEXT;
      ALTER TABLE energy_journal ADD COLUMN IF NOT EXISTS intention TEXT;
    `);

    // Energy Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS energy_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        lang TEXT DEFAULT 'zh',
        dominant_element TEXT,
        weak_element TEXT,
        balance_score FLOAT,
        today_theme TEXT,
        share_thumbnail TEXT,
        is_ai_complete BOOLEAN DEFAULT FALSE,
        report_data JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to energy_reports if they don't exist
    await pool.query(`
      ALTER TABLE energy_reports ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(uid);
      ALTER TABLE energy_reports ADD COLUMN IF NOT EXISTS dominant_element TEXT;
      ALTER TABLE energy_reports ADD COLUMN IF NOT EXISTS is_ai_complete BOOLEAN DEFAULT FALSE;
      ALTER TABLE energy_reports ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // Sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        image_cards JSONB,
        word_cards JSONB,
        pairs JSONB,
        association_text JSONB,
        session_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to sessions if they don't exist
    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pairs JSONB;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS association_text JSONB;
    `);

    // AI Prompts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_prompts (
        id SERIAL PRIMARY KEY,
        module_name TEXT,
        content_zh TEXT,
        content_ja TEXT,
        status TEXT DEFAULT 'active',
        version TEXT,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to ai_prompts if they don't exist
    await pool.query(`
      ALTER TABLE ai_prompts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE ai_prompts ADD COLUMN IF NOT EXISTS category TEXT;
    `);

    // Bottles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bottles (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        content TEXT,
        element TEXT,
        lang TEXT DEFAULT 'zh',
        origin_locale TEXT,
        card_id TEXT,
        quote TEXT,
        report_id TEXT REFERENCES energy_reports(id),
        sender_nickname TEXT,
        card_image_url TEXT,
        card_name_saved TEXT,
        energy_color_tag TEXT,
        view_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to bottles if they don't exist
    await pool.query(`
      ALTER TABLE bottles ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
      ALTER TABLE bottles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE bottles ADD COLUMN IF NOT EXISTS energy_color_tag TEXT;
    `);

    // Bottle Tags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bottle_tags (
        id SERIAL PRIMARY KEY,
        tag TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure UNIQUE constraint on tag for bottle_tags
    try {
      await pool.query(`ALTER TABLE bottle_tags ADD CONSTRAINT bottle_tags_tag_key UNIQUE (tag)`);
    } catch (e) {
      // Ignore if constraint already exists
    }

    // Bottle Blessings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bottle_blessings (
        id SERIAL PRIMARY KEY,
        bottle_id INTEGER REFERENCES bottles(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(uid),
        tag_id INTEGER REFERENCES bottle_tags(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sensitive Words table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensitive_words (
        id SERIAL PRIMARY KEY,
        word TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure UNIQUE constraint on word for sensitive_words
    try {
      await pool.query(`ALTER TABLE sensitive_words ADD CONSTRAINT sensitive_words_word_key UNIQUE (word)`);
    } catch (e) {
      // Ignore if constraint already exists
    }

    // Bottle Replies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bottle_replies (
        id SERIAL PRIMARY KEY,
        bottle_id INTEGER REFERENCES bottles(id) ON DELETE CASCADE,
        sender_id TEXT REFERENCES users(uid),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Saved Bottles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_bottles (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        bottle_id INTEGER REFERENCES bottles(id) ON DELETE CASCADE,
        reply_message TEXT,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, bottle_id)
      );
    `);

    // Site Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Rebuild Music Tracks table (Drop and Recreate as requested)
    console.log("Rebuilding music_tracks table...");
    await pool.query(`DROP TABLE IF EXISTS music_tracks CASCADE;`);
    await pool.query(`
      CREATE TABLE music_tracks (
        id SERIAL PRIMARY KEY,
        name TEXT,
        title TEXT,
        artist TEXT,
        category TEXT,
        element TEXT,
        url TEXT UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed data
    const seedTracks = [
      {
        name: "Little Forest Spirit Tea Time",
        title: "Little Forest Spirit Tea Time",
        artist: "EUNIE",
        category: "meditation",
        element: "wood",
        url: "https://firebasestorage.googleapis.com/v0/b/yuni-8f439.firebasestorage.app/o/eunie-assets%2Faudio%2FLittle%20Forest%20Spirit%20Tea%20Time%EF%BC%88%E6%9C%A8%EF%BC%89%20(1).mp3?alt=media&token=a4b620ff-080e-4ada-9979-3a3cd5221d16",
        sort_order: 1
      },
      {
        name: "Little Ember Tea Time",
        title: "Little Ember Tea Time",
        artist: "EUNIE",
        category: "meditation",
        element: "fire",
        url: "https://firebasestorage.googleapis.com/v0/b/yuni-8f439.firebasestorage.app/o/eunie-assets%2Faudio%2FLittle%20Ember%20Tea%20Time%EF%BC%88%E7%81%AB%EF%BC%89%20(1).mp3?alt=media&token=a2ff4eae-aa55-4021-a52e-de4b2583e3e7",
        sort_order: 2
      },
      {
        name: "Little Mountain Garden Tea Time",
        title: "Little Mountain Garden Tea Time",
        artist: "EUNIE",
        category: "meditation",
        element: "earth",
        url: "https://firebasestorage.googleapis.com/v0/b/yuni-8f439.firebasestorage.app/o/eunie-assets%2Faudio%2FLittle%20Mountain%20Garden%20Tea%20Time%EF%BC%88%E5%9C%9F%EF%BC%89%20(1).mp3?alt=media&token=bcbc6bc1-723e-47f5-8fef-4c8b4354c392",
        sort_order: 3
      },
      {
        name: "Little Silver Bell Tea Time",
        title: "Little Silver Bell Tea Time",
        artist: "EUNIE",
        category: "meditation",
        element: "metal",
        url: "https://firebasestorage.googleapis.com/v0/b/yuni-8f439.firebasestorage.app/o/eunie-assets%2Faudio%2FLittle%20Silver%20Bell%20Tea%20Time%EF%BC%88%E9%87%91%EF%BC%89%20(1).mp3?alt=media&token=ca1588a8-ec99-4729-a6e8-4e25cc395e2e",
        sort_order: 4
      },
      {
        name: "Little River Breeze Tea Time",
        title: "Little River Breeze Tea Time",
        artist: "EUNIE",
        category: "meditation",
        element: "water",
        url: "https://firebasestorage.googleapis.com/v0/b/yuni-8f439.firebasestorage.app/o/eunie-assets%2Faudio%2FLittle%20River%20Breeze%20Tea%20Time%EF%BC%88%E6%B0%B4%EF%BC%89%20(1).mp3?alt=media&token=40dfaf97-93fb-4e74-bea2-d95fabd71b0c",
        sort_order: 5
      }
    ];

    for (const track of seedTracks) {
      await pool.query(
        `INSERT INTO music_tracks (name, title, artist, category, element, url, sort_order) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (url) DO NOTHING`,
        [track.name, track.title, track.artist, track.category, track.element, track.url, track.sort_order]
      );
    }
    console.log("Music tracks table rebuilt and seeded.");

    // Manifestations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manifestations (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        wish_title TEXT,
        deadline TIMESTAMP,
        deadline_option TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cards Image table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards_image (
        id TEXT PRIMARY KEY,
        locale TEXT,
        name TEXT,
        name_en TEXT,
        image_url TEXT,
        description TEXT,
        elements JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cards Word table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards_word (
        id TEXT PRIMARY KEY,
        locale TEXT,
        name TEXT,
        name_en TEXT,
        text TEXT,
        image_url TEXT,
        description TEXT,
        elements JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default settings if not exists
    await pool.query(`
      INSERT INTO site_settings (key, value)
      VALUES ('seo', '{"title": "EUNIE 嶼妳 | 懂妳的能量，平衡妳的生活", "description": "透過五行能量卡片，探索內在自我，獲得每日心靈指引與能量平衡。", "keywords": "能量卡片, 五行, 心靈導引, 冥想, 自我探索", "og_image": "https://picsum.photos/seed/lumina-og/1200/630", "google_analytics_id": "", "search_console_id": "", "index_enabled": true}')
      ON CONFLICT (key) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO site_settings (key, value)
      VALUES ('fonts', '{"zh": {"display": {"url": "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700&display=swap", "family": "\\"Noto Serif TC\\", serif"}, "body": {"url": "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500&display=swap", "family": "\\"Noto Sans TC\\", sans-serif"}}, "ja": {"display": {"url": "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&display=swap", "family": "\\"Shippori Mincho\\", serif"}, "body": {"url": "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500&display=swap", "family": "\\"Noto Sans JP\\", sans-serif"}}}')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Seed bottle tags
    await pool.query(`
      INSERT INTO bottle_tags (tag)
      VALUES ('love'), ('career'), ('health'), ('family'), ('friendship'), ('wealth'), ('spiritual')
      ON CONFLICT (tag) DO NOTHING;
    `);

    // Seed sensitive words
    await pool.query(`
      INSERT INTO sensitive_words (word)
      VALUES ('scam'), ('fraud'), ('abuse'), ('hate'), ('violence')
      ON CONFLICT (word) DO NOTHING;
    `);

    // Seed admin user
    const adminEmail = "rulai0725@gmail.com";
    await pool.query(`
      INSERT INTO users (uid, email, display_name, role, subscription_status)
      VALUES ('admin_default', $1, 'Admin', 'admin', 'active')
      ON CONFLICT (uid) DO NOTHING;
    `, [adminEmail]);

    // Seed default AI prompts if none exist
    const promptCount = await pool.query("SELECT COUNT(*) FROM ai_prompts");
    if (parseInt(promptCount.rows[0].count) === 0) {
      const defaultPrompts = [
        {
          module_name: 'Core System',
          content_zh: '你是一位專業的能量療癒師與心靈導師。你的任務是根據用戶選擇的卡片與輸入的內容，提供溫暖、有洞察力且平衡的能量分析。',
          content_ja: 'あなたは専門的なエネルギーヒーラーであり、心の導師です。あなたの任務は、ユーザーが選択したカードと入力内容に基づいて、温かく、洞察力があり、バランスの取れたエネルギー分析を提供することです。',
          category: 'core',
          status: 'active',
          version: '1.0.0'
        },
        {
          module_name: 'Energy Report Generator',
          content_zh: '請根據以下五行能量分佈與卡片訊息，生成一份詳細的能量平衡報告。報告應包含今日主題、優勢元素分析、需要平衡的建議以及一段鼓勵的話。',
          content_ja: '以下の五行エネルギー分布とカードメッセージに基づいて、詳細なエネルギーバランスレポートを生成してください。レポートには、今日のテーマ、優勢な要素の分析、バランスを取るためのアドバイス、そして励ましの言葉を含める必要があります。',
          category: 'scenario',
          status: 'active',
          version: '1.0.0'
        },
        {
          module_name: 'JSON Format Specification',
          content_zh: '請務必以 JSON 格式回傳，包含以下欄位：today_theme (今日主題), dominant_analysis (優勢分析), balance_advice (平衡建議), encouragement (鼓勵語)。',
          content_ja: '必ず以下のフィールドを含むJSON形式で返してください：today_theme（今日のテーマ）、dominant_analysis（優勢分析）、balance_advice（バランスアドバイス）、encouragement（励ましの言葉）。',
          category: 'format',
          status: 'active',
          version: '1.0.0'
        }
      ];

      for (const p of defaultPrompts) {
        await pool.query(
          "INSERT INTO ai_prompts (module_name, content_zh, content_ja, category, status, version) VALUES ($1, $2, $3, $4, $5, $6)",
          [p.module_name, p.content_zh, p.content_ja, p.category, p.status, p.version]
        );
      }
      console.log("Default AI prompts seeded.");
    }

    console.log("Database initialization complete.");

    // Sync cards after database is initialized
    await syncCardsFromJson(pool);
  } catch (err) {
    console.error("Error during database initialization:", err);
    throw err;
  }
}

/**
 * Syncs card data from JSON files in /public/data into the database.
 * This ensures the database matches the "correct" frontend data.
 */
async function syncCardsFromJson(pool: pg.Pool) {
  const dataDir = path.join(process.cwd(), "public", "data");
  const files = [
    { name: "cards_tw_img.json", type: "img", locale: "zh-TW" },
    { name: "cards_jp_img.json", type: "img", locale: "ja-JP" },
    { name: "cards_tw_word.json", type: "word", locale: "zh-TW" },
    { name: "cards_jp_word.json", type: "word", locale: "ja-JP" },
  ];

  console.log("Starting card data synchronization from JSON files...");

  try {
    // We'll use UPSERT instead of DELETE + INSERT to prevent data loss if sync fails
    // However, if we want to ensure ONLY JSON data exists, we might need a different approach.
    // For now, let's just ensure defaults are there.

    for (const file of files) {
      const filePath = path.join(dataDir, file.name);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
      }

      const rawData = fs.readFileSync(filePath, "utf-8");
      const cards = JSON.parse(rawData);
      console.log(`Processing ${cards.length} cards from ${file.name}...`);

      for (const card of cards) {
        try {
          if (file.type === "img") {
            await pool.query(
              `INSERT INTO cards_image (id, locale, name, name_en, image_url, description, elements)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 locale = EXCLUDED.locale,
                 name = EXCLUDED.name,
                 name_en = EXCLUDED.name_en,
                 image_url = EXCLUDED.image_url,
                 description = EXCLUDED.description,
                 elements = EXCLUDED.elements`,
              [
                card.card_id,
                card.locale,
                card.card_name,
                card.card_name_en,
                card.image_path,
                card.description || card.card_name,
                JSON.stringify(card.elements)
              ]
            );
          } else {
            await pool.query(
              `INSERT INTO cards_word (id, locale, name, name_en, text, image_url, description, elements)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET
                 locale = EXCLUDED.locale,
                 name = EXCLUDED.name,
                 name_en = EXCLUDED.name_en,
                 text = EXCLUDED.text,
                 image_url = EXCLUDED.image_url,
                 description = EXCLUDED.description,
                 elements = EXCLUDED.elements`,
              [
                card.card_id,
                card.locale,
                card.card_name,
                card.card_name_en,
                card.card_name, // In word cards, card_name is the text
                card.image_path,
                card.card_name,
                JSON.stringify(card.elements)
              ]
            );
          }
        } catch (innerErr) {
          console.error(`Error inserting card ${card.card_id}:`, innerErr);
        }
      }
      console.log(`Synced ${cards.length} cards from ${file.name}`);
    }
    console.log("Card data synchronization complete.");
  } catch (err) {
    console.error("Error during card synchronization:", err);
  }
}

startServer();
