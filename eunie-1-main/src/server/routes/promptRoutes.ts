import { Router } from "express";
import { pool } from "../db.ts";

const router = Router();

router.get("/active", async (req, res) => {
  const { lang } = req.query;
  const language = lang === 'ja' ? 'ja' : 'zh';
  try {
    const result = await pool.query(
      "SELECT module_name, content_zh, content_ja FROM ai_prompts WHERE status = 'active' ORDER BY category ASC, module_name ASC"
    );
    
    if (result.rows.length > 0) {
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

export default router;
