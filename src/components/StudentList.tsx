import React, { useState, useEffect } from 'react';
import type { Student } from '../types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Search, UserPlus, Eye, Edit, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { api } from '../lib/api';

interface StudentListProps {
  onSelectStudent: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
  onDeleteStudent?: (student: Student) => void;
  onAddNew?: () => void;
  showActions?: boolean;
}

<<<<<<< HEAD
=======
const API_URL = 'https://adaptacoescurriculares-api.onrender.com';
import { apiFetch } from '../lib/api';
>>>>>>> b97e84a78e3e4e15db920414c230afd5d561b2f3

export function StudentList({ 
  onSelectStudent, 
  onEditStudent, 
  onDeleteStudent,
  onAddNew,
  showActions = false 
}: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [nameFilter, setNameFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, nameFilter, courseFilter, classFilter]);

  async function loadStudents() {
    try {
      setLoading(true);
      setError('');
<<<<<<< HEAD
      const data = await api.getStudents();
=======
      const data = await apiFetch(`${API_URL}/students`);
>>>>>>> b97e84a78e3e4e15db920414c230afd5d561b2f3
      setStudents(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar estudantes');
    } finally {
      setLoading(false);
    }
  }

  function filterStudents() {
    let filtered = students;

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

  const handleDelete = async (student: Student) => {
    if (window.confirm(`Deseja realmente excluir o estudante ${student.name}?`)) {
      if (onDeleteStudent) {
        onDeleteStudent(student);
      }
    }
  };

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Estudantes</CardTitle>
            {onAddNew && (
              <Button onClick={onAddNew} className="gap-2">
                <UserPlus className="size-4" />
                Novo Estudante
              </Button>
            )}
          </div>
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
              <p className="text-gray-500">Nenhum estudante encontrado</p>
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
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Curso: {student.course}</span>
                      <span>Turma: {student.class}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectStudent(student)}
                      className="gap-2"
                    >
                      <Eye className="size-4" />
                      Visualizar
                    </Button>
                    
                    {showActions && onEditStudent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditStudent(student)}
                      >
                        <Edit className="size-4" />
                      </Button>
                    )}
                    
                    {showActions && onDeleteStudent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(student)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
