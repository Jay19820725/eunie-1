import pg from "pg";
import path from "path";
import fs from "fs";

const { Pool } = pg;

// Database setup with robust fallback for empty env vars
const rawDbUrl = process.env.DATABASE_URL;
const isValidDbUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === "" || url === "undefined" || url === "null") return false;
  try {
    if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) return false;
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const connectionString = isValidDbUrl(rawDbUrl) 
  ? rawDbUrl! 
  : "postgresql://root:sy9aLY7vAHcEfji2U5b0R6n348kQV1NK@tpe1.clusters.zeabur.com:23833/zeabur";

export const pool = new Pool({
  connectionString,
  ssl: false,
  connectionTimeoutMillis: 10000,
});

/**
 * Initializes database tables and seeds default data.
 */
export async function initializeDatabase() {
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
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        language TEXT DEFAULT 'zh',
        loop_stage TEXT DEFAULT 'calibration'
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'zh';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS loop_stage TEXT DEFAULT 'calibration';
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

    // Energy Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS energy_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        lang TEXT DEFAULT 'zh',
        report_type TEXT DEFAULT 'daily',
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
        tag_id INTEGER,
        view_count INTEGER DEFAULT 0,
        hug_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure UNIQUE constraint on report_id for bottles
    try {
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bottles_report_id_unique ON bottles(report_id) WHERE report_id IS NOT NULL`);
    } catch (e) {}

    // Bottle Tags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bottle_tags (
        id SERIAL PRIMARY KEY,
        tag TEXT UNIQUE,
        zh TEXT,
        ja TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        color TEXT,
        category TEXT DEFAULT 'blessing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // Music Tracks table
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

    // Seed default settings
    await pool.query(`
      INSERT INTO site_settings (key, value)
      VALUES ('seo', '{"title": "EUNIE 嶼妳 | 懂妳的能量，平衡妳的生活", "description": "透過五行能量卡片，探索內在自我，獲得每日心靈指引與能量平衡。", "keywords": "能量卡片, 五行, 心靈導引, 冥想, 自我探索", "og_image": "https://picsum.photos/seed/lumina-og/1200/630", "google_analytics_id": "", "search_console_id": "", "index_enabled": true}')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Seed bottle tags
    const blessingTags = [
      { tag: 'peace', zh: '平安健康', ja: '平穏無事', order: 1 },
      { tag: 'success', zh: '順心如意', ja: '思い通り', order: 2 },
      { tag: 'wealth', zh: '財源廣進', ja: '金運上昇', order: 3 },
      { tag: 'career', zh: '事業有成', ja: '仕事成就', order: 4 },
      { tag: 'study', zh: '學業進步', ja: '學業成就', order: 5 },
      { tag: 'love', zh: '感情美滿', ja: '恋愛成就', order: 6 },
      { tag: 'family', zh: '家庭和睦', ja: '家庭円満', order: 7 },
      { tag: 'luck', zh: '萬事大吉', ja: '万事大吉', order: 8 },
      { tag: 'wish', zh: '心想事成', ja: '願望成就', order: 9 },
      { tag: 'blessing', zh: '福氣滿滿', ja: '福徳円満', order: 10 }
    ];

    for (const bt of blessingTags) {
      await pool.query(
        `INSERT INTO bottle_tags (tag, zh, ja, sort_order) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (tag) DO UPDATE SET zh = EXCLUDED.zh, ja = EXCLUDED.ja, sort_order = EXCLUDED.sort_order`,
        [bt.tag, bt.zh, bt.ja, bt.order]
      );
    }

    // Seed admin user
    const adminEmail = "rulai0725@gmail.com";
    await pool.query(`
      INSERT INTO users (uid, email, display_name, role, subscription_status)
      VALUES ('admin_default', $1, 'Admin', 'admin', 'active')
      ON CONFLICT (uid) DO NOTHING;
    `, [adminEmail]);

    // Performance Indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_energy_reports_user_ts ON energy_reports(user_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_bottles_user_active_created ON bottles(user_id, is_active, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bottles_is_active_created ON bottles(is_active, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bottle_blessings_bottle_id ON bottle_blessings(bottle_id);
      CREATE INDEX IF NOT EXISTS idx_bottle_replies_bottle_id ON bottle_replies(bottle_id);
      CREATE INDEX IF NOT EXISTS idx_saved_bottles_user_id ON saved_bottles(user_id);
      CREATE INDEX IF NOT EXISTS idx_energy_journal_user_date ON energy_journal(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_time ON sessions(user_id, session_time DESC);
    `);

    console.log("Database initialization complete.");
    await syncCardsFromJson();
  } catch (err) {
    console.error("Error during database initialization:", err);
    throw err;
  }
}

/**
 * Syncs card data from JSON files in /public/data into the database.
 */
async function syncCardsFromJson() {
  const dataDir = path.join(process.cwd(), "public", "data");
  const files = [
    { name: "cards_tw_img.json", type: "img", locale: "zh-TW" },
    { name: "cards_jp_img.json", type: "img", locale: "ja-JP" },
    { name: "cards_tw_word.json", type: "word", locale: "zh-TW" },
    { name: "cards_jp_word.json", type: "word", locale: "ja-JP" },
  ];

  console.log("Starting card data synchronization...");

  try {
    for (const file of files) {
      const filePath = path.join(dataDir, file.name);
      if (!fs.existsSync(filePath)) continue;

      const rawData = fs.readFileSync(filePath, "utf-8");
      const cards = JSON.parse(rawData);

      for (const card of cards) {
        try {
          if (file.type === "img") {
            await pool.query(
              `INSERT INTO cards_image (id, locale, name, name_en, image_url, description, elements)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 locale = EXCLUDED.locale, name = EXCLUDED.name, name_en = EXCLUDED.name_en,
                 image_url = EXCLUDED.image_url, description = EXCLUDED.description, elements = EXCLUDED.elements`,
              [card.card_id, card.locale, card.card_name, card.card_name_en, card.image_path, card.description || card.card_name, JSON.stringify(card.elements)]
            );
          } else {
            await pool.query(
              `INSERT INTO cards_word (id, locale, name, name_en, text, image_url, description, elements)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET
                 locale = EXCLUDED.locale, name = EXCLUDED.name, name_en = EXCLUDED.name_en,
                 text = EXCLUDED.text, image_url = EXCLUDED.image_url, description = EXCLUDED.description, elements = EXCLUDED.elements`,
              [card.card_id, card.locale, card.card_name, card.card_name_en, card.card_name, card.image_path, card.card_name, JSON.stringify(card.elements)]
            );
          }
        } catch (innerErr) {
          console.error(`Error inserting card ${card.card_id}:`, innerErr);
        }
      }
    }
    console.log("Card data synchronization complete.");
  } catch (err) {
    console.error("Error during card synchronization:", err);
  }
}
