import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Validate required environment variables early to avoid cryptic crashes
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  throw new Error('Environment misconfiguration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Global error handler to standardize unexpected errors
app.onError((err, c) => {
  try {
    console.error('Unhandled error in request:', err?.stack || err);
  } catch (logErr) {
    console.error('Error while logging an error', logErr);
  }
  // Respond with a normalized JSON error
  return c.json({ error: 'Erro interno do servidor' }, 500);
});

// Helper function to get user from access token
async function getUserFromToken(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return null;
  }
  return user;
}

// ============================================
// AUTH ROUTES
// ============================================

// Sign up
app.post('/make-server-2a0842b8/signup', async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    if (!email || !password || !name || !role) {
      return c.json({ error: 'Todos os campos são obrigatórios' }, 400);
    }

    if (role !== 'coordenador' && role !== 'professor') {
      return c.json({ error: 'Perfil inválido' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error during user signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role
    });

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: 'Erro ao criar usuário' }, 500);
  }
});

// Get current user profile
app.get('/make-server-2a0842b8/me', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    return c.json({ user: profile });
  } catch (error) {
    console.log(`Error fetching user profile: ${error}`);
    return c.json({ error: 'Erro ao buscar perfil' }, 500);
  }
});

// ============================================
// STUDENT ROUTES (Coordenadores only)
// ============================================

app.get('/make-server-2a0842b8/students', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const students = await kv.getByPrefix('student:');
    return c.json({ students: students || [] });
  } catch (error) {
    console.log(`Error fetching students: ${error}`);
    return c.json({ error: 'Erro ao buscar estudantes' }, 500);
  }
});

app.post('/make-server-2a0842b8/students', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || profile.role !== 'coordenador') {
      return c.json({ error: 'Acesso negado. Apenas coordenadores podem registrar estudantes.' }, 403);
    }

    const studentData = await c.req.json();
    const studentId = crypto.randomUUID();
    const student = {
      id: studentId,
      ...studentData,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };

    await kv.set(`student:${studentId}`, student);
    return c.json({ student });
  } catch (error) {
    console.log(`Error creating student: ${error}`);
    return c.json({ error: 'Erro ao criar estudante' }, 500);
  }
});

app.put('/make-server-2a0842b8/students/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || profile.role !== 'coordenador') {
      return c.json({ error: 'Acesso negado. Apenas coordenadores podem editar estudantes.' }, 403);
    }

    const studentId = c.req.param('id');
    const existingStudent = await kv.get(`student:${studentId}`);
    if (!existingStudent) {
      return c.json({ error: 'Estudante não encontrado' }, 404);
    }

    const updates = await c.req.json();
    const updatedStudent = {
      ...existingStudent,
      ...updates,
      id: studentId,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };

    await kv.set(`student:${studentId}`, updatedStudent);
    return c.json({ student: updatedStudent });
  } catch (error) {
    console.log(`Error updating student: ${error}`);
    return c.json({ error: 'Erro ao atualizar estudante' }, 500);
  }
});

app.delete('/make-server-2a0842b8/students/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || profile.role !== 'coordenador') {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    const studentId = c.req.param('id');
    await kv.del(`student:${studentId}`);
    
    // Also delete related adaptations and reports
    const adaptations = await kv.getByPrefix(`adaptation:${studentId}:`);
    const reports = await kv.getByPrefix(`report:${studentId}:`);
    
    for (const adaptation of adaptations) {
      await kv.del(`adaptation:${studentId}:${adaptation.id}`);
    }
    for (const report of reports) {
      await kv.del(`report:${studentId}:${report.id}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting student: ${error}`);
    return c.json({ error: 'Erro ao excluir estudante' }, 500);
  }
});

// ============================================
// ADAPTATION ROUTES (Coordenadores only)
// ============================================

app.get('/make-server-2a0842b8/adaptations/:studentId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const studentId = c.req.param('studentId');
    const adaptations = await kv.getByPrefix(`adaptation:${studentId}:`);
    return c.json({ adaptations: adaptations || [] });
  } catch (error) {
    console.log(`Error fetching adaptations: ${error}`);
    return c.json({ error: 'Erro ao buscar adaptações' }, 500);
  }
});

app.post('/make-server-2a0842b8/adaptations', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || profile.role !== 'coordenador') {
      return c.json({ error: 'Acesso negado. Apenas coordenadores podem registrar adaptações.' }, 403);
    }

    const adaptationData = await c.req.json();
    const adaptationId = crypto.randomUUID();
    const adaptation = {
      id: adaptationId,
      ...adaptationData,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };

    await kv.set(`adaptation:${adaptationData.studentId}:${adaptationId}`, adaptation);
    return c.json({ adaptation });
  } catch (error) {
    console.log(`Error creating adaptation: ${error}`);
    return c.json({ error: 'Erro ao criar adaptação' }, 500);
  }
});

app.put('/make-server-2a0842b8/adaptations/:studentId/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || profile.role !== 'coordenador') {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    const studentId = c.req.param('studentId');
    const adaptationId = c.req.param('id');
    const key = `adaptation:${studentId}:${adaptationId}`;
    
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ error: 'Adaptação não encontrada' }, 404);
    }

    const updates = await c.req.json();
    const updated = {
      ...existing,
      ...updates,
      id: adaptationId,
      studentId,
      updatedAt: new Date().toISOString()
    };

    await kv.set(key, updated);
    return c.json({ adaptation: updated });
  } catch (error) {
    console.log(`Error updating adaptation: ${error}`);
    return c.json({ error: 'Erro ao atualizar adaptação' }, 500);
  }
});

app.delete('/make-server-2a0842b8/adaptations/:studentId/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || profile.role !== 'coordenador') {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    const studentId = c.req.param('studentId');
    const adaptationId = c.req.param('id');
    await kv.del(`adaptation:${studentId}:${adaptationId}`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting adaptation: ${error}`);
    return c.json({ error: 'Erro ao excluir adaptação' }, 500);
  }
});

// ============================================
// REPORT ROUTES (Professores)
// ============================================

app.get('/make-server-2a0842b8/student-report/:studentId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const studentId = c.req.param('studentId');
    const reports = await kv.getByPrefix(`report:${studentId}:`);
    return c.json({ reports: reports || [] });
  } catch (error) {
    console.log(`Error fetching reports: ${error}`);
    return c.json({ error: 'Erro ao buscar relatos' }, 500);
  }
});

app.post('/make-server-2a0842b8/reports', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    const reportData = await c.req.json();
    const reportId = crypto.randomUUID();
    const report = {
      id: reportId,
      ...reportData,
      teacherId: user.id,
      teacherName: profile.name,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await kv.set(`report:${reportData.studentId}:${reportId}`, report);
    return c.json({ report });
  } catch (error) {
    console.log(`Error creating report: ${error}`);
    return c.json({ error: 'Erro ao criar relato' }, 500);
  }
});

app.put('/make-server-2a0842b8/reports/:studentId/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const studentId = c.req.param('studentId');
    const reportId = c.req.param('id');
    const key = `report:${studentId}:${reportId}`;
    
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ error: 'Relato não encontrado' }, 404);
    }

    // Only the author can edit
    if (existing.teacherId !== user.id) {
      return c.json({ error: 'Acesso negado. Você só pode editar seus próprios relatos.' }, 403);
    }

    const updates = await c.req.json();
    const updated = {
      ...existing,
      ...updates,
      id: reportId,
      studentId,
      updatedAt: new Date().toISOString()
    };

    await kv.set(key, updated);
    return c.json({ report: updated });
  } catch (error) {
    console.log(`Error updating report: ${error}`);
    return c.json({ error: 'Erro ao atualizar relato' }, 500);
  }
});

app.delete('/make-server-2a0842b8/reports/:studentId/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const studentId = c.req.param('studentId');
    const reportId = c.req.param('id');
    const key = `report:${studentId}:${reportId}`;
    
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ error: 'Relato não encontrado' }, 404);
    }

    // Only the author can delete
    if (existing.teacherId !== user.id) {
      return c.json({ error: 'Acesso negado. Você só pode excluir seus próprios relatos.' }, 403);
    }

    await kv.del(key);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting report: ${error}`);
    return c.json({ error: 'Erro ao excluir relato' }, 500);
  }
});

// ============================================
// FULL STUDENT REPORT (with adaptations and reports)
// ============================================

app.get('/make-server-2a0842b8/reports/:studentId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const studentId = c.req.param('studentId');
    const student = await kv.get(`student:${studentId}`);
    if (!student) {
      return c.json({ error: 'Estudante não encontrado' }, 404);
    }

    const adaptations = await kv.getByPrefix(`adaptation:${studentId}:`);
    const reports = await kv.getByPrefix(`report:${studentId}:`);

    // Sort reports by date (newest first)
    const sortedReports = (reports || []).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return c.json({
      student,
      adaptations: adaptations || [],
      reports: sortedReports
    });
  } catch (error) {
    console.log(`Error fetching student report: ${error}`);
    return c.json({ error: 'Erro ao buscar relatório' }, 500);
  }
});

Deno.serve(app.fetch);
