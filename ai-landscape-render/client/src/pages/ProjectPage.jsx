import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

const EXAMPLE_PROMPTS = [
  'Replace the lawn with river stone paving and add a curved gravel path',
  'Add native Australian grasses and a low grey brick retaining wall along the back fence',
  'Remove the dead shrub on the left and plant three small ornamental trees instead',
  'Add outdoor step lighting along the path and a timber garden edge',
];

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [renders, setRenders] = useState([]);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const [prompt, setPrompt] = useState('');
  const [sourceRenderId, setSourceRenderId] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = () =>
    api.getProject(id).then((data) => {
      setProject(data.project);
      setRenders(data.renders);
    });

  useEffect(() => {
    load().catch((err) => setLoadError(err.message));
  }, [id]);

  const doneRenders = renders.filter((r) => r.status === 'done');
  let sourceImage;
  if (sourceRenderId === 'original') {
    sourceImage = project?.original_image_path;
  } else if (sourceRenderId) {
    sourceImage = doneRenders.find((r) => String(r.id) === String(sourceRenderId))?.result_image_path;
  } else {
    sourceImage =
      doneRenders.length > 0
        ? doneRenders[doneRenders.length - 1].result_image_path
        : project?.original_image_path;
  }

  const onGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    try {
      let effectiveSourceId;
      if (sourceRenderId === 'original') {
        effectiveSourceId = undefined;
      } else if (sourceRenderId) {
        effectiveSourceId = sourceRenderId;
      } else if (doneRenders.length > 0) {
        effectiveSourceId = doneRenders[doneRenders.length - 1].id;
      }
      await api.createRender(id, prompt.trim(), effectiveSourceId);
      setPrompt('');
      await load();
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const onDeleteRender = async (renderId) => {
    if (!confirm('Delete this render?')) return;
    try {
      await api.deleteRender(id, renderId);
      if (String(sourceRenderId) === String(renderId)) setSourceRenderId('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loadError) return <div className="page"><div className="error-banner">{loadError}</div></div>;
  if (!project) return <div className="page-center">Loading…</div>;

  return (
    <div className="page">
      <div className="project-header">
        <Link to="/" className="btn btn-ghost">
          ← All projects
        </Link>
        <h1>{project.name}</h1>
      </div>

      <div className="project-layout">
        <div className="card">
          <h2>Current base image</h2>
          <img className="base-preview" src={sourceImage} alt="Current base" />

          {doneRenders.length > 0 && (
            <label>
              Generate from
              <select value={sourceRenderId} onChange={(e) => setSourceRenderId(e.target.value)}>
                <option value="">Latest render</option>
                <option value="original">Original photo</option>
                {doneRenders.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id}: {r.prompt.slice(0, 50)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={onGenerate} className="prompt-form">
            <label>
              Describe the change
              <textarea
                rows={3}
                placeholder="e.g. Replace the lawn with sandstone paving and add native grasses along the fence"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </label>
            <div className="example-prompts">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  type="button"
                  key={ex}
                  className="chip"
                  onClick={() => setPrompt(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" type="submit" disabled={generating}>
              {generating ? 'Generating… (can take up to a minute)' : 'Generate render'}
            </button>
            <p className="muted small">
              Uses the free Pollinations.ai image service — anonymous use allows roughly one
              request every 15 seconds, so please be patient between renders.
            </p>
          </form>
        </div>

        <div className="card">
          <h2>History</h2>
          <div className="history-list">
            <div className="history-item">
              <img src={project.original_image_path} alt="Original" />
              <div>
                <strong>Original photo</strong>
              </div>
            </div>
            {renders.map((r) => (
              <div className="history-item" key={r.id}>
                {r.status === 'done' && <img src={r.result_image_path} alt={r.prompt} />}
                {r.status === 'pending' && <div className="history-thumb-placeholder">Generating…</div>}
                {r.status === 'error' && <div className="history-thumb-placeholder error">Failed</div>}
                <div>
                  <p>{r.prompt}</p>
                  {r.status === 'error' && <p className="error-text">{r.error_message}</p>}
                  <div className="history-actions">
                    {r.status === 'done' && (
                      <button className="btn btn-ghost" onClick={() => setSourceRenderId(String(r.id))}>
                        Use as base
                      </button>
                    )}
                    <button className="btn btn-ghost btn-danger" onClick={() => onDeleteRender(r.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
