const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');

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
      if (!res.ok) throw new Error('No autorizado');
      return res.json();
    },

    async updateProfile(profile) {
      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || Object.values(data).flat().join(' ') || 'No se pudo guardar el nombre');
      }
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
      const res = await fetch(`${API_BASE_URL}/tax-records/`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || Object.values(data).flat().join(' ') || 'Error al crear expediente');
      return data;
    },

    async update(id, formData) {
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/`, {
        method: 'PATCH',
        headers: getMultipartHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || Object.values(data).flat().join(' ') || 'Error al actualizar expediente');
      return data;
    },

    async delete(id) {
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al eliminar lógicamente el expediente');
    },

    async getAll(params = {}) {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.year && params.year !== 'Todos los ejercicios' && params.year !== 'Todos') query.append('year', params.year);
      if (params.country && params.country !== 'Todos los países' && params.country !== 'Todos') query.append('country', params.country);
      if (params.emisor && params.emisor !== 'Todos los emisores' && params.emisor !== 'Todos') query.append('emisor', params.emisor);
      if (params.doc_type && params.doc_type !== 'Todos los documentos' && params.doc_type !== 'Todos') query.append('doc_type', params.doc_type);
      if (params.status && params.status !== 'Todos') query.append('status', params.status);

      const res = await fetch(`${API_BASE_URL}/tax-records/?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al obtener calificaciones');
      return res.json();
    },

    async getById(id) {
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al obtener detalle del expediente');
      return res.json();
    },

    async getStats() {
      const res = await fetch(`${API_BASE_URL}/tax-records/dashboard_stats/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al obtener estadísticas');
      return res.json();
    },

    async downloadPdf(id, filename = 'expediente.pdf') {
      const res = await fetch(`${API_BASE_URL}/tax-records/${id}/download_pdf/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al descargar documento verificado');
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
      if (!res.ok) throw new Error('Error al obtener solicitudes');
      return res.json();
    },

    async resolve(id, action, comment) {
      const res = await fetch(`${API_BASE_URL}/approvals/${id}/resolve/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.comment || 'Error al resolver la solicitud');
      return data;
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
      if (!res.ok) throw new Error('Error al validar archivo');
      return res.json();
    },

    async confirm(filename) {
      const res = await fetch(`${API_BASE_URL}/bulk-upload/confirm/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) throw new Error('Error al confirmar carga masiva');
      return res.json();
    },
  },

  audit: {
    async getAll(params = {}) {
      const query = new URLSearchParams();
      if (params.tax_record_id) query.append('tax_record_id', params.tax_record_id);

      const res = await fetch(`${API_BASE_URL}/audit/?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al obtener registros de auditoría');
      return res.json();
    },
  },

  admin: {
    async getUsers() {
      const res = await fetch(`${API_BASE_URL}/admin/users/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('No fue posible obtener los usuarios');
      return res.json();
    },

    async createUser(user) {
      const res = await fetch(`${API_BASE_URL}/admin/users/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || Object.values(data).flat().join(' ') || 'No fue posible crear el usuario');
      }
      return data;
    },
  },
};
