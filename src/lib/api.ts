// Helper de fetch para a aplicação cliente
// - adiciona timeout
// - parseia JSON de forma segura
// - lança erros padronizados com `status` e `body`

const API_URL = 'https://adaptacoescurriculares-api.onrender.com';

export async function apiFetch(input: RequestInfo, init?: RequestInit, timeout = 10000) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(input, { ...init, signal });
    clearTimeout(timer);

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message = (data && (data.error || data.message)) || response.statusText || 'Erro na requisição';
      const error: any = new Error(message);
      error.status = response.status;
      error.body = data;
      throw error;
    }

    return data;
  } catch (err: any) {
    if (err && err.name === 'AbortError') {
      const timeoutError: any = new Error('Tempo de requisição esgotado');
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw err;
  }
}

export default apiFetch;

// Pequeno wrapper com métodos usados pela UI
export const api = {
  getStudents: async () => {
    const res = await apiFetch(`${API_URL}/students`);
    if (Array.isArray(res)) return res;
    // Handle common API envelope shapes
    if (res && typeof res === 'object') {
      if (Array.isArray((res as any).value)) return (res as any).value;
      if (Array.isArray((res as any).students)) return (res as any).students;
    }
    return [];
  },
  createStudent: async (student: any) => apiFetch(`${API_URL}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(student) }),
  updateStudent: async (studentId: string, updates: any) => apiFetch(`${API_URL}/students/${studentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }),
  getAdaptations: async (studentId: string) => {
    try {
      const res = await apiFetch(`${API_URL}/adaptations/${studentId}`);
      if (Array.isArray(res)) return res;
      // Handle envelope shapes
      if (res && typeof res === 'object') {
        if (Array.isArray((res as any).value)) return (res as any).value;
        if (Array.isArray((res as any).adaptations)) return (res as any).adaptations;
      }
      return [];
    } catch (err: any) {
      // If 404, return empty array (no adaptations for this student)
      if (err?.status === 404) return [];
      throw err;
    }
  },
  createAdaptation: async (adaptation: any) => apiFetch(`${API_URL}/adaptations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adaptation) }),
  updateAdaptation: async (studentId: string, adaptationId: string, updates: any) => {
    try {
      return await apiFetch(`${API_URL}/adaptations/${adaptationId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    } catch (err: any) {
      if (err?.status === 404) {
        return await apiFetch(`${API_URL}/adaptations/${studentId}/${adaptationId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      }
      throw err;
    }
  },
  getReports: async (studentId: string) => {
    try {
      const res = await apiFetch(`${API_URL}/reports/${studentId}`);
      if (Array.isArray(res)) return res;
      // Handle envelope shapes
      if (res && typeof res === 'object') {
        if (Array.isArray((res as any).value)) return (res as any).value;
        if (Array.isArray((res as any).reports)) return (res as any).reports;
      }
      return [];
    } catch (err: any) {
      // If 404, return empty array (no reports for this student)
      if (err?.status === 404) return [];
      throw err;
    }
  },
  getStudentReport: async (studentId: string) => {
    try {
      const res = await apiFetch(`${API_URL}/reports/${studentId}`);

      // If API already returned the aggregated object, normalize and return it
      if (res && typeof res === 'object' && ('student' in res || 'reports' in res || 'adaptations' in res)) {
        const student = (res as any).student ?? null;
        const adaptations = (res as any).adaptations ?? [];
        const reports = (res as any).reports ?? [];
        return { student, adaptations, reports };
      }

      // If API returned an array, try to detect its type and assemble the full object
      if (Array.isArray(res)) {
        const first = res[0];

        // If array looks like students list
        if (first && (first.registrationNumber || first.birthDate || first.course)) {
          const students: any[] = res;
          const student = students.find((s) => String(s.id) === String(studentId)) || null;
          const [adaptations, reports] = await Promise.all([
            apiFetch(`${API_URL}/adaptations/${studentId}`).catch(() => []),
            apiFetch(`${API_URL}/reports/${studentId}`).catch(() => []),
          ]);
          return { student, adaptations: adaptations || [], reports: reports || [] };
        }

        // If array looks like reports
        if (first && (first.subject || first.teacherId || first.result)) {
          const reports: any[] = res;
          const studentsResp = await apiFetch(`${API_URL}/students`).catch(() => []);
          const student = Array.isArray(studentsResp) ? studentsResp.find((s: any) => String(s.id) === String(studentId)) : null;
          const adaptations = await apiFetch(`${API_URL}/adaptations/${studentId}`).catch(() => []);
          return { student, adaptations: adaptations || [], reports: reports || [] };
        }

        // If array looks like adaptations
        if (first && (first.justification || first.description)) {
          const adaptations: any[] = res;
          const studentsResp = await apiFetch(`${API_URL}/students`).catch(() => []);
          const student = Array.isArray(studentsResp) ? studentsResp.find((s: any) => String(s.id) === String(studentId)) : null;
          const reports = await apiFetch(`${API_URL}/reports/${studentId}`).catch(() => []);
          return { student, adaptations: adaptations || [], reports: reports || [] };
        }
      }

      // Fallback: try to fetch student, adaptations and reports separately
      const [students, adaptations, reports] = await Promise.all([
        apiFetch(`${API_URL}/students`).catch(() => []),
        apiFetch(`${API_URL}/adaptations/${studentId}`).catch(() => []),
        apiFetch(`${API_URL}/reports/${studentId}`).catch(() => []),
      ]);
      const student = Array.isArray(students) ? students.find((s: any) => String(s.id) === String(studentId)) : null;
      return { student, adaptations: adaptations || [], reports: reports || [] };
    } catch (err: any) {
      // If the aggregated endpoint returned 404, assemble data from other endpoints
      if (err?.status === 404) {
        const [students, adaptations, reports] = await Promise.all([
          apiFetch(`${API_URL}/students`).catch(() => []),
          apiFetch(`${API_URL}/adaptations/${studentId}`).catch(() => []),
          apiFetch(`${API_URL}/reports/${studentId}`).catch(() => []),
        ]);
        const student = Array.isArray(students) ? students.find((s: any) => String(s.id) === String(studentId)) : null;
        return {
          student,
          adaptations: adaptations || [],
          reports: reports || [],
        };
      }
      throw err;
    }
  },
  createReport: async (report: any) => apiFetch(`${API_URL}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) }),
  updateReport: async (studentId: string, reportId: string, updates: any) => {
    try {
      return await apiFetch(`${API_URL}/reports/${reportId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    } catch (err: any) {
      if (err?.status === 404) {
        return await apiFetch(`${API_URL}/reports/${studentId}/${reportId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      }
      throw err;
    }
  },
  deleteStudent: async (studentId: string) => apiFetch(`${API_URL}/students/${studentId}`, { method: 'DELETE' }),
  deleteAdaptation: async (studentId: string, adaptationId: string) => {
    try {
      return await apiFetch(`${API_URL}/adaptations/${adaptationId}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err?.status === 404) {
        return await apiFetch(`${API_URL}/adaptations/${studentId}/${adaptationId}`, { method: 'DELETE' });
      }
      throw err;
    }
  },
  deleteReport: async (studentId: string, reportId: string) => {
    try {
      return await apiFetch(`${API_URL}/reports/${reportId}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err?.status === 404) {
        return await apiFetch(`${API_URL}/reports/${studentId}/${reportId}`, { method: 'DELETE' });
      }
      throw err;
    }
  },
};

