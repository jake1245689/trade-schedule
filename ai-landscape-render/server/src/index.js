require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { UPLOADS_DIR } = require('./upload');
const authRoutes = require('./routes/auth');
const { router: projectsRoutes } = require('./routes/projects');
const rendersRoutes = require('./routes/renders');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/projects/:projectId/renders', rendersRoutes);

app.use((err, req, res, next) => {
  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI landscape render server listening on port ${PORT}`);
});
