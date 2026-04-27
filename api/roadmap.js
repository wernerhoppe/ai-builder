const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB = process.env.NOTION_DATABASE_ID;

// Display tag lookup by card name
const TAG_MAP = {
  'Email Inbox Triage':  'Quick Win · Gmail MCP',
  'SNF Referral Parser': 'Medium Lift · PACS',
  'Flashcard Generator': 'Quick Win · GPA',
  'Weekly News Digest':  'Medium Lift · Attention',
  'Tax Prep Checklist':  'Quick Win · Annual',
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET: return all rows ──────────────────────────────────
    if (req.method === 'GET') {
      const response = await notion.databases.query({
        database_id: DB,
        sorts: [{ property: 'Priority', direction: 'ascending' }],
      });

      const cards = response.results.map(page => {
        const name = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
        const fullDesc = page.properties.Description?.rich_text?.[0]?.plain_text || '';
        // Short description for card display (first sentence or 90 chars)
        const dot = fullDesc.indexOf('. ');
        const shortDesc = dot > 0 && dot < 90 ? fullDesc.slice(0, dot + 1) : fullDesc.slice(0, 90) + (fullDesc.length > 90 ? '…' : '');

        return {
          id: page.id,
          name,
          status:      page.properties.Status?.select?.name   || 'To Build',
          priority:    page.properties.Priority?.select?.name || 'Medium',
          description: shortDesc,
          tag:         TAG_MAP[name] || page.properties.Priority?.select?.name || 'Medium',
        };
      });

      return res.json(cards);
    }

    // ── PATCH: update Status by page ID ──────────────────────
    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      const { id, status } = body;

      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }

      const validStatuses = ['Suggested', 'To Build', 'In Progress', 'Done'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      await notion.pages.update({
        page_id: id,
        properties: {
          Status: { select: { name: status } },
        },
      });

      return res.json({ ok: true, id, status });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[api/roadmap]', err);
    return res.status(500).json({ error: err.message });
  }
};
