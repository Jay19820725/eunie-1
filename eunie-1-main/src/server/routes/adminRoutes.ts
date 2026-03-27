import { Router } from "express";
import { pool } from "../db.ts";

const router = Router();

// Admin Stats
router.get("/stats", async (req, res) => {
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

// User Management
router.get("/users", async (req, res) => {
  const limit = req.query.limit || 50;
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY register_date DESC LIMIT $1", [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Session Management
router.get("/sessions", async (req, res) => {
  const limit = req.query.limit || 50;
  try {
    const result = await pool.query("SELECT * FROM sessions ORDER BY session_time DESC LIMIT $1", [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all sessions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/sessions/drafts", async (req, res) => {
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

// Card Management
router.post("/cards/image", async (req, res) => {
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

router.delete("/cards/image/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM cards_image WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting image card:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cards/word", async (req, res) => {
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

router.delete("/cards/word/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM cards_word WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting word card:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Subscription Management
router.get("/subscriptions", async (req, res) => {
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

// Report Management
router.get("/reports", async (req, res) => {
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

router.delete("/reports/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM energy_reports WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting admin report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reports", async (req, res) => {
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

// Prompt Management
router.get("/prompts", async (req, res) => {
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

router.post("/prompts", async (req, res) => {
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

router.delete("/prompts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM ai_prompts WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting prompt:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/prompts/:id/activate", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE ai_prompts SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error activating prompt:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Music Management
router.get("/music", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM music_tracks ORDER BY sort_order ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin music:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/music", async (req, res) => {
  const { name, title, artist, category, element, url, is_active, sort_order } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  const safeSortOrder = parseInt(sort_order) || 0;
  try {
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
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error saving music track:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/music/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM music_tracks WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting music track:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Analytics Management
router.get("/analytics", async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const usersResult = await pool.query("SELECT * FROM users");
    const sessionsResult = await pool.query("SELECT * FROM sessions WHERE session_time >= $1", [thirtyDaysAgo]);
    const journalsResult = await pool.query("SELECT * FROM energy_journal");

    const allUsers = usersResult.rows;
    const allSessions = sessionsResult.rows;
    const allJournals = journalsResult.rows;

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

// Site Settings Management
router.post("/settings/:key", async (req, res) => {
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

router.delete("/bottles/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM bottles WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting bottle:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bottles/tags", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM bottle_tags 
      WHERE (zh IS NOT NULL AND zh != '') OR (ja IS NOT NULL AND ja != '')
      ORDER BY sort_order ASC, created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin bottle tags:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bottles/tags", async (req, res) => {
  const { id, zh, ja, color, category, sort_order } = req.body;
  if ((!zh || zh.trim() === '') && (!ja || ja.trim() === '')) {
    return res.status(400).json({ error: "At least one translation (ZH or JA) must be provided" });
  }
  try {
    if (id) {
      await pool.query(
        "UPDATE bottle_tags SET zh = $1, ja = $2, color = $3, category = $4, sort_order = $5 WHERE id = $6",
        [zh, ja, color, category || 'blessing', sort_order || 0, id]
      );
    } else {
      await pool.query(
        "INSERT INTO bottle_tags (zh, ja, color, category, sort_order) VALUES ($1, $2, $3, $4, $5)",
        [zh, ja, color, category || 'blessing', sort_order || 0]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving bottle tag:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/bottles/tags/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM bottle_tags WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting bottle tag:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Sensitive Words Management
router.get("/sensitive-words", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sensitive_words ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sensitive words:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sensitive-words", async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Word is required" });
  try {
    await pool.query("INSERT INTO sensitive_words (word) VALUES ($1) ON CONFLICT DO NOTHING", [word]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding sensitive word:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/sensitive-words/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM sensitive_words WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting sensitive word:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
