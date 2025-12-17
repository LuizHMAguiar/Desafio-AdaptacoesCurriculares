import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { reportStorage } from '../lib/storage';
import type { Report, ReportResult } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';

interface ReportFormProps {
  studentId: string;
  report?: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdReport?: Report) => void;
}

export function ReportForm({ 
  studentId, 
  report, 
  open, 
  onOpenChange, 
  onSuccess 
}: ReportFormProps) {
  const [formData, setFormData] = useState({
    subject: '',
    result: 'neutro' as ReportResult,
    description: '',
    date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (report) {
      setFormData({
        subject: report.subject,
        result: report.result,
        description: report.description,
        // convert ISO date to yyyy-mm-dd for input[type=date]
        date: report.date ? new Date(report.date).toISOString().slice(0,10) : '',
      });
    } else {
      setFormData({
        subject: '',
        result: 'neutro',
        description: '',
        date: new Date().toISOString().slice(0,10),
      });
    }
  }, [report, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.subject || !formData.description) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (!formData.date) {
      setError('Por favor, informe a data do relato');
      return;
    }

    setLoading(true);
    try {
        let created: Report | undefined;
      if (report) {
        try {
          await api.updateReport(studentId, report.id, formData);
          toast.success('Relato atualizado com sucesso!');
        } catch (err) {
          // ignore remote failure
        }
        const local = reportStorage.update(report.id, {
          subject: formData.subject,
          result: formData.result as any,
          description: formData.description,
          date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        });
        created = local || undefined;
      } else {
        const payload = { ...formData, studentId, date: new Date(formData.date).toISOString() };
        try {
          const res = await api.createReport(payload);
          if (res && (res as any).id) {
            created = reportStorage.create({
              id: (res as any).id,
              studentId,
              subject: formData.subject,
              result: formData.result as any,
              description: formData.description,
              date: new Date(formData.date).toISOString(),
            } as any);
          } else {
            created = reportStorage.create({
              studentId,
              subject: formData.subject,
              result: formData.result as any,
              description: formData.description,
              date: new Date(formData.date).toISOString(),
            } as any);
          }
          toast.success('Relato registrado com sucesso!');
        } catch (err) {
          created = reportStorage.create({
            studentId,
            subject: formData.subject,
            result: formData.result as any,
            description: formData.description,
            date: new Date(formData.date).toISOString(),
          } as any);
          toast.success('Relato registrado localmente (offline)');
        }
      }
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar relato');
      toast.error(err.message || 'Erro ao salvar relato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {report ? 'Editar Relato' : 'Novo Relato'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Disciplina *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Ex: Matemática, Português..."
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="result">Resultado *</Label>
            <Select
              value={formData.result}
              onValueChange={(value) => handleChange('result', value)}
              disabled={loading}
            >
              <SelectTrigger id="result">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positivo">Positivo</SelectItem>
                <SelectItem value="neutro">Neutro</SelectItem>
                <SelectItem value="negativo">Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição Detalhada *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descreva os detalhes do acompanhamento, progressos observados, dificuldades, etc..."
              rows={6}
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : report ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
