import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { api } from '../lib/api';
import { toast } from 'sonner';
import type { Student } from '../types';
import { Database, DownloadCloud } from 'lucide-react';

const API_URL = 'https://adaptacoescurriculares-api.onrender.com';

export function ApiStudentList({ onClose, onImport }: { onClose?: () => void; onImport?: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [localRegistrationSet, setLocalRegistrationSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
    loadLocal();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/students`);
      if (!res.ok) throw new Error('Erro ao buscar estudantes na API');
      const data = await res.json();
      // Some responses wrap items under `value`
      const list = Array.isArray(data) ? data : data?.value || [];
      setStudents(list);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar estudantes');
    } finally {
      setLoading(false);
    }
  }

  async function loadLocal() {
    try {
      const local = await api.getStudents();
      const regs = new Set<string>(local.map(s => String(s.registrationNumber || '').toLowerCase()));
      setLocalRegistrationSet(regs);
    } catch (err) {
      // ignore
    }
  }

  const handleImport = async (remote: any) => {
    const idKey = String(remote.id || remote.registrationNumber || remote.email || Math.random());
    setImportingIds(prev => new Set(prev).add(idKey));
    try {
      // Map remote fields to local Student shape (partial)
      const studentPartial: Partial<Student> = {
        name: remote.name || '',
        course: remote.course || '',
        class: remote.class || remote.turma || '',
        birthDate: remote.birthDate || '',
        registrationNumber: String(remote.registrationNumber || remote.id || ''),
        guardianName: remote.guardianName || '',
        guardianContact: remote.guardianContact || '',
      };

      await api.createStudent(studentPartial);
      toast.success('Estudante importado com sucesso');
      // update local registrations cache
      setLocalRegistrationSet(prev => new Set(prev).add(String(studentPartial.registrationNumber || '').toLowerCase()));
      onImport?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar estudante');
    } finally {
      setImportingIds(prev => {
        const copy = new Set(prev);
        copy.delete(idKey);
        return copy;
      });
    }
  };

  const importAll = async () => {
    const toImport = students.filter(s => {
      const reg = String(s.registrationNumber || '').toLowerCase();
      return !reg || !localRegistrationSet.has(reg) ? true : false;
    });
    if (toImport.length === 0) {
      toast('Todos os estudantes já foram importados');
      return;
    }

    for (const s of toImport) {
      // eslint-disable-next-line no-await-in-loop
      await handleImport(s);
    }
    await loadLocal();
  };

  const filtered = students.filter(s =>
    !query || (s.name || '').toLowerCase().includes(query.toLowerCase()) || (s.registrationNumber || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-full">
              <Database className="size-5 text-green-600" />
            </div>
            <CardTitle>Estudantes (API)</CardTitle>
          </div>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="apiSearch">Buscar</Label>
            <Input id="apiSearch" placeholder="Filtrar por nome ou matrícula" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={importAll} className="gap-2">
              <DownloadCloud className="size-4" />
              Importar tudo
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Carregando estudantes da API...</p>
        ) : (
          <div className="space-y-2">
                {filtered.map((s: any) => (
              <div key={s.id || s.registrationNumber} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <strong>{s.name}</strong>
                    <span className="text-sm text-gray-600">{s.registrationNumber}</span>
                  </div>
                  <div className="text-sm text-gray-600">Curso: {s.course} • Turma: {s.class}</div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleImport(s)} disabled={importingIds.has(String(s.id || s.registrationNumber)) || localRegistrationSet.has(String(s.registrationNumber || '').toLowerCase())} className="gap-2">
                    <DownloadCloud className="size-4" />
                    {importingIds.has(String(s.id || s.registrationNumber)) ? 'Importando...' : localRegistrationSet.has(String(s.registrationNumber || '').toLowerCase()) ? 'Importado' : 'Importar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ApiStudentList;
