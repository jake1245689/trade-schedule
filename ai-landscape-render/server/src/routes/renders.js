const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { UPLOADS_DIR } = require('../upload');
const { editImage } = require('../pollinations');
const { loadProjectOwnedBy, toPublicPath, deleteUploadedFile } = require('./projects');

const router = express.Router({ mergeParams: true });

const EXT_BY_CONTENT_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function absoluteUrlFor(req, publicPath) {
  return `${req.protocol}://${req.get('host')}${publicPath}`;
}

router.post('/', requireAuth, async (req, res) => {
  const project = loadProjectOwnedBy(req.params.projectId, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const prompt = (req.body && req.body.prompt ? String(req.body.prompt) : '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Please describe the change you want (plants, paving, placement, etc).' });
  }

  let sourceImagePath = project.original_image_path;
  if (req.body.sourceRenderId) {
    const sourceRender = db
      .prepare('SELECT * FROM renders WHERE id = ? AND project_id = ?')
      .get(req.body.sourceRenderId, project.id);
    if (!sourceRender || sourceRender.status !== 'done' || !sourceRender.result_image_path) {
      return res.status(400).json({ error: 'The selected source render is not available.' });
    }
    sourceImagePath = sourceRender.result_image_path;
  }

  const insertInfo = db
    .prepare(
      'INSERT INTO renders (project_id, source_image_path, prompt, status) VALUES (?, ?, ?, ?)'
    )
    .run(project.id, sourceImagePath, prompt, 'pending');
  const renderId = insertInfo.lastInsertRowid;

  try {
    const sourceUrl = absoluteUrlFor(req, sourceImagePath);
    const { buffer, contentType } = await editImage(sourceUrl, prompt);

    const ext = EXT_BY_CONTENT_TYPE[contentType] || '.jpg';
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

    db.prepare("UPDATE renders SET status = 'done', result_image_path = ? WHERE id = ?").run(
      toPublicPath(filename),
      renderId
    );
  } catch (err) {
    db.prepare("UPDATE renders SET status = 'error', error_message = ? WHERE id = ?").run(
      err.message || 'Generation failed.',
      renderId
    );
  }

  const render = db.prepare('SELECT * FROM renders WHERE id = ?').get(renderId);
  if (render.status === 'error') {
    return res.status(502).json({ error: render.error_message, render });
  }
  res.status(201).json({ render });
});

router.delete('/:renderId', requireAuth, (req, res) => {
  const project = loadProjectOwnedBy(req.params.projectId, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const render = db
    .prepare('SELECT * FROM renders WHERE id = ? AND project_id = ?')
    .get(req.params.renderId, project.id);
  if (!render) return res.status(404).json({ error: 'Render not found.' });

  deleteUploadedFile(render.result_image_path);
  db.prepare('DELETE FROM renders WHERE id = ?').run(render.id);
  res.json({ ok: true });
});

module.exports = router;
