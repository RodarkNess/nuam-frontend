const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const configuredUrlIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(configuredApiUrl || '');
const productionApiUrl = 'https://nuam-backend-t5z9.vercel.app/api/v1';
const API_BASE_URL = (
  (configuredApiUrl && (!configuredUrlIsLocal || isLocalHost))
    ? configuredApiUrl
    : (isLocalHost ? 'http://127.0.0.1:8000/api/v1' : productionApiUrl)
).replace(/\/$/, '');

async function handleApiResponse(res, fallbackMessage) {
  if (res.status === 401) {
    localStorage.removeItem('nuam_access_token');
    localStorage.removeItem('nuam_refresh_token');
    localStorage.removeItem('nuam_user');
    sessionStorage.setItem('nuam_session_expired', 'Tu sesión expiró. Inicia sesión nuevamente.');
    window.location.replace('/');
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const message = data?.detail
      || (data && typeof data === 'object' ? Object.values(data).flat().join(' ') : '')
      || fallbackMessage;
    throw new Error(message);
  }
  return data;
}

function getAuthHeaders() {
  const token = localStorage.getItem('nuam_access_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getMultipartHeaders() {
  const token = localStorage.getItem('nuam_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  auth: {
    async login(email, password, twoFactorCode = '') {
      const res = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          two_factor_code: twoFactorCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al iniciar sesión');
      }
      if (data.access) {
        localStorage.setItem('nuam_access_token', data.access);
        localStorage.setItem('nuam_refresh_token', data.refresh);
        localStorage.setItem('nuam_user', JSON.stringify(data.user));
      }
      return data;
    },

    async me() {
      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        headers: getAuthHeaders(),
      });
      return handleApiResponse(res, 'No autorizado');
    },

    async updateProfile(profile) {
      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(profile),
      });
      const data = await handleApiResponse(res, 'No se pudo guardar el nombre');
      localStorage.setItem('nuam_user', JSON.stringify(data));
      return data;
    },

    logout() {
      localStorage.removeItem('nuam_access_token');
      localStorage.removeItem('nuam_refresh_token');
      localStorage.removeItem('nuam_user');
    },

    getCurrentUser() {
      const user = localStorage.getItem('nuam_user');
      return user ? JSON.parse(user) : null;
    },
  },

  taxRecords: {
    async create(formData) {
      formData.set('country', 'Chile');
      const res = await fetch(`${API_BASE_URL}/tax-records/`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData,
      });
      return handleApiResponse(res, 'Error al crear expediente');
    },

    async update(id, formData) {
      formData.set('country', 'Chile');
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/`, {
        method: 'PATCH',
        headers: getMultipartHeaders(),
        body: formData,
      });
      return handleApiResponse(res, 'Error al actualizar expediente');
    },

    async delete(id) {
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await handleApiResponse(res, 'Error al eliminar lógicamente el expediente');
    },

    async getAll(params = {}) {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.year && params.year !== 'Todos los ejercicios' && params.year !== 'Todos') query.append('year', params.year);
      if (params.emisor && params.emisor !== 'Todos los emisores' && params.emisor !== 'Todos') query.append('emisor', params.emisor);
      if (params.doc_type && params.doc_type !== 'Todos los documentos' && params.doc_type !== 'Todos') query.append('doc_type', params.doc_type);
      if (params.status && params.status !== 'Todos') query.append('status', params.status);

      const res = await fetch(`${API_BASE_URL}/tax-records/?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleApiResponse(res, 'Error al obtener calificaciones');
    },

    async getById(id) {
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/`, {
        headers: getAuthHeaders(),
      });
      return handleApiResponse(res, 'Error al obtener detalle del expediente');
    },

    async getStats() {
      const res = await fetch(`${API_BASE_URL}/tax-records/dashboard_stats/`, {
        headers: getAuthHeaders(),
      });
      return handleApiResponse(res, 'Error al obtener estadísticas');
    },

    async downloadPdf(id, filename = 'expediente.pdf') {
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/download_pdf/`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        await handleApiResponse(res, 'Error al descargar documento verificado');
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al descargar documento verificado');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  },

  approvals: {
    async getAll(params = {}) {
      const query = new URLSearchParams();
      if (params.priority && params.priority !== 'Todas') query.append('priority', params.priority);
      if (params.status && params.status !== 'Todas') query.append('status', params.status);

      const res = await fetch(`${API_BASE_URL}/approvals/?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleApiResponse(res, 'Error al obtener solicitudes');
    },

    async resolve(id, action, comment) {
      const res = await fetch(`${API_BASE_URL}/approvals/${id}/resolve/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, comment }),
      });
      return handleApiResponse(res, 'Error al resolver la solicitud');
    },
  },

  bulkUpload: {
    async validate(file) {
      const formData = new FormData();
      if (file) formData.append('file', file);

      const token = localStorage.getItem('nuam_access_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/bulk-upload/validate/`, {
        method: 'POST',
        headers,
        body: formData,
      });
      return handleApiResponse(res, 'Error al validar archivo');
    },

    async confirm(batchId) {
      const res = await fetch(`${API_BASE_URL}/bulk-upload/confirm/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ job_id: batchId, batch_id: batchId }),
      });
      return handleApiResponse(res, 'Error al confirmar carga masiva');
    },
  },

  audit: {
    async getAll(params = {}) {
      const query = new URLSearchParams();
      if (params.tax_record_id) query.append('tax_record_id', params.tax_record_id);

      const res = await fetch(`${API_BASE_URL}/audit/?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleApiResponse(res, 'Error al obtener registros de auditoría');
    },
  },

  admin: {
    async getUsers() {
      const res = await fetch(`${API_BASE_URL}/admin/users/`, {
        headers: getAuthHeaders(),
      });
      return handleApiResponse(res, 'No fue posible obtener los usuarios');
    },

    async createUser(user) {
      const res = await fetch(`${API_BASE_URL}/admin/users/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      });
      return handleApiResponse(res, 'No fue posible crear el usuario');
    },

    async updateUser(id, changes) {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(changes),
      });
      return handleApiResponse(res, 'No fue posible actualizar el usuario');
    },
  },
};
