import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => api.listProjects().then((d) => setProjects(d.projects));

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  const onFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !file) return;
    setCreating(true);
    setError('');
    try {
      const { project } = await api.createProject(name.trim(), file);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this project and all its renders? This cannot be undone.')) return;
    try {
      await api.deleteProject(id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h2>New project</h2>
        <p className="muted">
          Upload a photo of the space (a front yard, backyard, courtyard, etc). You'll describe
          plants, paving, placement and other changes on the next screen.
        </p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onCreate} className="new-project-form">
          <label>
            Project name
            <input
              type="text"
              placeholder="e.g. 24 Smith St - front yard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} required />
          </label>
          {preview && <img className="file-preview" src={preview} alt="Selected preview" />}
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create project'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Your projects</h2>
        {!projects && <p className="muted">Loading…</p>}
        {projects && projects.length === 0 && <p className="muted">No projects yet — create one above.</p>}
        <div className="project-grid">
          {projects &&
            projects.map((p) => (
              <div className="project-tile" key={p.id}>
                <Link to={`/projects/${p.id}`}>
                  <img src={p.original_image_path} alt={p.name} />
                  <div className="project-tile-body">
                    <strong>{p.name}</strong>
                    <span className="muted">
                      {p.render_count} render{p.render_count === 1 ? '' : 's'}
                    </span>
                  </div>
                </Link>
                <button className="btn btn-ghost btn-danger" onClick={() => onDelete(p.id)}>
                  Delete
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
