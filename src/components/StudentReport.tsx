import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { adaptationStorage, reportStorage } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import type { StudentReport as StudentReportType, Adaptation, Report } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Printer,
  Calendar,
  FileText,
  User,
  GraduationCap
} from 'lucide-react';
import { AdaptationForm } from './AdaptationForm';
import { ReportForm } from './ReportForm';
import { toast } from 'sonner';

interface StudentReportProps {
  studentId: string;
  onBack: () => void;
}

export function StudentReport({ studentId, onBack }: StudentReportProps) {
  const { user } = useAuth();
  const [data, setData] = useState<StudentReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [adaptationFormOpen, setAdaptationFormOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [editingAdaptation, setEditingAdaptation] = useState<Adaptation | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  useEffect(() => {
    loadReport();
  }, [studentId]);

  async function loadReport(createdItem?: Report | Adaptation) {
    try {
      // If a created item is provided, optimistically add it to the current state
      if (createdItem && data) {
        // Distinguish report vs adaptation by unique fields
        if ((createdItem as Report).result !== undefined) {
          // it's a Report
          setData({
            ...data,
            reports: [(createdItem as Report), ...(Array.isArray(data.reports) ? data.reports : [])]
          });
          return;
        }
        if ((createdItem as Adaptation).justification !== undefined) {
          // it's an Adaptation
          setData({
            ...data,
            adaptations: [(createdItem as Adaptation), ...(Array.isArray(data.adaptations) ? data.adaptations : [])]
          });
          return;
        }
      }

      setLoading(true);
      setError('');
      let reportData: any = null;
      try {
        reportData = await api.getStudentReport(studentId);
      } catch (err) {
        // remote failed - we'll assemble from local storage
        reportData = { student: null, adaptations: [], reports: [] };
      }

      // Always merge local stored adaptations/reports so local creates persist
      const localAdaptations = adaptationStorage.getByStudent(studentId) || [];
      const localReports = reportStorage.getByStudent(studentId) || [];

      const asArray = (v: any) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
      };

      const mergedAdaptationsMap = new Map<string, any>();
      asArray(reportData.adaptations).forEach((a: any) => mergedAdaptationsMap.set(String(a.id || a._localId || JSON.stringify(a)), a));
      (localAdaptations || []).forEach((a: any) => mergedAdaptationsMap.set(String(a.id || a._localId || JSON.stringify(a)), a));
      const mergedReportsMap = new Map<string, any>();
      asArray(reportData.reports).forEach((r: any) => mergedReportsMap.set(String(r.id || r._localId || JSON.stringify(r)), r));
      (localReports || []).forEach((r: any) => mergedReportsMap.set(String(r.id || r._localId || JSON.stringify(r)), r));

      const merged = {
        student: reportData.student || null,
        adaptations: Array.from(mergedAdaptationsMap.values()),
        reports: Array.from(mergedReportsMap.values()),
      };

      setData(merged);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteAdaptation = async (adaptation: Adaptation) => {
    if (window.confirm('Deseja realmente excluir esta adaptação?')) {
      try {
        // delete locally first
        adaptationStorage.delete(adaptation.id);
        try {
          await api.deleteAdaptation(studentId, adaptation.id);
        } catch (err) {
          // ignore remote failure
        }
        toast.success('Adaptação excluída com sucesso!');
        loadReport();
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir adaptação');
      }
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (window.confirm('Deseja realmente excluir este relato?')) {
      try {
        reportStorage.delete(report.id);
        try {
          await api.deleteReport(studentId, report.id);
        } catch (err) {
          // ignore remote failure
        }
        toast.success('Relato excluído com sucesso!');
        loadReport();
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir relato');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getResultBadge = (result: string) => {
    const safe = (result || 'neutro').toString().toLowerCase();
    const variants: Record<string, string> = {
      positivo: 'default',
      neutro: 'secondary',
      negativo: 'destructive',
    };
    const label = safe.charAt(0).toUpperCase() + safe.slice(1);
    const variant = variants[safe] || 'secondary';
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Data não informada';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Data não informada';
    return d.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">Carregando relatório...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Dados não encontrados'}</AlertDescription>
          </Alert>
          <Button onClick={onBack} className="mt-4">
            Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCoordinator = user?.role === 'coordenador';
  // Defensive: ensure adaptations/reports are arrays to avoid runtime errors
  const adaptations = Array.isArray(data.adaptations) ? data.adaptations : [];
  const reports = Array.isArray(data.reports) ? data.reports : [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="size-4" />
            Imprimir
          </Button>
        </div>

        {/* Student Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <GraduationCap className="size-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>{data.student?.name || 'Nome não disponível'}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Matrícula: {data.student?.registrationNumber || '—'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Curso</p>
                <p>{data.student?.course || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Turma</p>
                <p>{data.student?.class || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data de Nascimento</p>
                <p>{formatDate(data.student?.birthDate)}</p>
              </div>
              {data.student?.guardianName && (
                <div>
                  <p className="text-sm text-gray-600">Responsável</p>
                  <p>{data.student?.guardianName}</p>
                  {data.student?.guardianContact && (
                    <p className="text-sm text-gray-500">{data.student?.guardianContact}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adaptations */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Adaptações Curriculares
              </CardTitle>
              {isCoordinator && (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setEditingAdaptation(null);
                    setAdaptationFormOpen(true);
                  }}
                  className="gap-2 print:hidden"
                >
                  <Plus className="size-4" />
                  Adicionar Adaptação
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {adaptations.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Nenhuma adaptação registrada
              </p>
            ) : (
              <div className="space-y-4">
                  {adaptations.map((adaptation) => (
                  <div key={adaptation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {formatDate(adaptation.date)}
                        </span>
                      </div>
                      {isCoordinator && (
                        <div className="flex gap-2 print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAdaptation(adaptation);
                              setAdaptationFormOpen(true);
                            }}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAdaptation(adaptation)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Descrição da Necessidade:</p>
                        <p>{adaptation.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Justificativa:</p>
                        <p>{adaptation.justification}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Relatos dos Professores
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingReport(null);
                  setReportFormOpen(true);
                }}
                className="gap-2 print:hidden"
              >
                <Plus className="size-4" />
                Adicionar Relato
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Nenhum relato registrado
              </p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span>{report.teacherName || user?.name || 'Professor(a)'}</span>
                          <Badge variant="outline">{report.subject || 'Disciplina'}</Badge>
                          {getResultBadge(report.result)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="size-3" />
                          {formatDate(report.date)}
                        </div>
                      </div>
                      {user?.id === report.teacherId && (
                        <div className="flex gap-2 print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingReport(report);
                              setReportFormOpen(true);
                            }}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReport(report)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{report.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isCoordinator && (
        <AdaptationForm
          studentId={studentId}
          adaptation={editingAdaptation}
          open={adaptationFormOpen}
          onOpenChange={setAdaptationFormOpen}
          onSuccess={loadReport}
        />
      )}

      <ReportForm
        studentId={studentId}
        report={editingReport}
        open={reportFormOpen}
        onOpenChange={setReportFormOpen}
        onSuccess={loadReport}
      />
    </>
  );
}
