import React, { useState, useEffect } from 'react';
import { StudentReport } from './StudentReport';
import type { Student } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Search, Eye, FileCheck } from 'lucide-react';
import { api } from '../lib/api';

export function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsWithAdaptations, setStudentsWithAdaptations] = useState<Set<string>>(new Set());
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Filters
  const [nameFilter, setNameFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, studentsWithAdaptations, nameFilter, courseFilter, classFilter]);

  async function loadStudents() {
    try {
      setLoading(true);
      setError('');
      const allStudents = await api.getStudents();

      // Check which students have adaptations
      const studentsWithAdaps = new Set<string>();
      for (const student of allStudents) {
        const adaptations = await api.getAdaptations(student.id);
        if (Array.isArray(adaptations) && adaptations.length > 0) {
          studentsWithAdaps.add(student.id);
        }
      }

      setStudents(allStudents);
      setStudentsWithAdaptations(studentsWithAdaps);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar estudantes');
    } finally {
      setLoading(false);
    }
  }

  function filterStudents() {
    // Only show students with adaptations
    let filtered = students.filter(s => studentsWithAdaptations.has(s.id));

    if (nameFilter) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (courseFilter) {
      filtered = filtered.filter(s => 
        s.course.toLowerCase().includes(courseFilter.toLowerCase())
      );
    }

    if (classFilter) {
      filtered = filtered.filter(s => 
        s.class.toLowerCase().includes(classFilter.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  }

  if (selectedStudentId) {
    return (
      <StudentReport
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
      />
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">Carregando estudantes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Painel do Professor</h2>
        <p className="text-gray-600">
          Estudantes com adaptações curriculares
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="size-5" />
            Estudantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nameFilter">Nome</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  id="nameFilter"
                  placeholder="Filtrar por nome"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseFilter">Curso</Label>
              <Input
                id="courseFilter"
                placeholder="Filtrar por curso"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classFilter">Turma</Label>
              <Input
                id="classFilter"
                placeholder="Filtrar por turma"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {studentsWithAdaptations.size === 0 
                  ? 'Nenhum estudante com adaptações curriculares cadastrado'
                  : 'Nenhum estudante encontrado com os filtros aplicados'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3>{student.name}</h3>
                      <Badge variant="outline">{student.registrationNumber}</Badge>
                      <Badge variant="default" className="gap-1">
                        <FileCheck className="size-3" />
                        Com Adaptações
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Curso: {student.course}</span>
                      <span>Turma: {student.class}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudentId(student.id)}
                    className="gap-2"
                  >
                    <Eye className="size-4" />
                    Visualizar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
