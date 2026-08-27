const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload, UPLOADS_DIR } = require('../upload');

const router = express.Router();

function toPublicPath(filename) {
  return `/uploads/${filename}`;
}

function deleteUploadedFile(publicPath) {
  if (!publicPath) return;
  const filename = path.basename(publicPath);
  const fullPath = path.join(UPLOADS_DIR, filename);
  fs.unlink(fullPath, () => {});
}

function loadProjectOwnedBy(projectId, userId) {
  return db
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(projectId, userId);
}

router.get('/', requireAuth, (req, res) => {
  const projects = db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM renders r WHERE r.project_id = p.id) AS render_count
       FROM projects p WHERE p.user_id = ? ORDER BY p.created_at DESC`
    )
    .all(req.userId);
  res.json({ projects });
});

router.post('/', requireAuth, upload.single('photo'), (req, res) => {
  const name = (req.body && req.body.name ? String(req.body.name) : '').trim();
  if (!name) {
    if (req.file) deleteUploadedFile(req.file.filename);
    return res.status(400).json({ error: 'Please give the project a name.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a photo of the space to redesign.' });
  }

  const info = db
    .prepare('INSERT INTO projects (user_id, name, original_image_path) VALUES (?, ?, ?)')
    .run(req.userId, name, toPublicPath(req.file.filename));

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ project });
});

router.get('/:id', requireAuth, (req, res) => {
  const project = loadProjectOwnedBy(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const renders = db
    .prepare('SELECT * FROM renders WHERE project_id = ? ORDER BY created_at ASC')
    .all(project.id);

  res.json({ project, renders });
});

router.delete('/:id', requireAuth, (req, res) => {
  const project = loadProjectOwnedBy(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const renders = db.prepare('SELECT * FROM renders WHERE project_id = ?').all(project.id);
  renders.forEach((r) => deleteUploadedFile(r.result_image_path));
  deleteUploadedFile(project.original_image_path);

  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  res.json({ ok: true });
});

module.exports = { router, loadProjectOwnedBy, toPublicPath, deleteUploadedFile };
