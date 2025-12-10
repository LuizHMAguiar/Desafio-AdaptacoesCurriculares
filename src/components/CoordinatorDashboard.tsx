import React, { useState } from 'react';
import { StudentList } from './StudentList';
import { StudentForm } from './StudentForm';
import { StudentReport } from './StudentReport';
import type { Student } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const API_URL = 'https://adaptacoescurriculares-api.onrender.com';

export function CoordinatorDashboard() {
  const [view, setView] = useState<'list' | 'form' | 'report'>('list');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setView('report');
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setView('form');
  };

  const handleDeleteStudent = async (student: Student) => {
    try {
      const response = await fetch(`${API_URL}/students/${student.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao excluir estudante');
      toast.success('Estudante excluído com sucesso!');
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir estudante');
    }
  };

  const handleAddNew = () => {
    setSelectedStudent(null);
    setView('form');
  };

  const handleFormSuccess = () => {
    setView('list');
    setSelectedStudent(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setView('list');
    setSelectedStudent(null);
  };

  const handleReportBack = () => {
    setView('list');
    setSelectedStudent(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Painel do Coordenador</h2>
        <p className="text-gray-600">
          Gerencie estudantes e suas adaptações curriculares
        </p>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList>
          <TabsTrigger value="students" className="gap-2">
            <Users className="size-4" />
            Estudantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {view === 'list' && (
            <StudentList
              key={refreshKey}
              onSelectStudent={handleSelectStudent}
              onEditStudent={handleEditStudent}
              onDeleteStudent={handleDeleteStudent}
              onAddNew={handleAddNew}
              showActions={true}
            />
          )}

          {view === 'form' && (
            <StudentForm
              student={selectedStudent}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          )}

          {view === 'report' && selectedStudent && (
            <StudentReport
              studentId={selectedStudent.id}
              onBack={handleReportBack}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
