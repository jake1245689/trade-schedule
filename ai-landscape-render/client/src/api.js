async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  listProjects: () => request('/projects'),
  createProject: (name, photoFile) => {
    const form = new FormData();
    form.append('name', name);
    form.append('photo', photoFile);
    return request('/projects', { method: 'POST', body: form });
  },
  getProject: (id) => request(`/projects/${id}`),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  createRender: (projectId, prompt, sourceRenderId) =>
    request(`/projects/${projectId}/renders`, {
      method: 'POST',
      body: JSON.stringify({ prompt, sourceRenderId: sourceRenderId || undefined }),
    }),
  deleteRender: (projectId, renderId) =>
    request(`/projects/${projectId}/renders/${renderId}`, { method: 'DELETE' }),
};
