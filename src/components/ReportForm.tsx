import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
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
        await api.updateReport(studentId, report.id, formData);
        toast.success('Relato atualizado com sucesso!');
      } else {
          // ensure date is sent as ISO string
          const payload = { ...formData, studentId, date: new Date(formData.date).toISOString() };
          created = await api.createReport(payload);
          toast.success('Relato registrado com sucesso!');
          // small delay to allow backend eventual consistency before reloading
          await new Promise((res) => setTimeout(res, 250));
      }
      // Close modal first, then notify parent to reload. Pass created report so parent can optimistically add it.
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
