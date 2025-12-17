import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { adaptationStorage } from '../lib/storage';
import type { Adaptation } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';

interface AdaptationFormProps {
  studentId: string;
  adaptation?: Adaptation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdAdaptation?: Adaptation) => void;
}

export function AdaptationForm({ 
  studentId, 
  adaptation, 
  open, 
  onOpenChange, 
  onSuccess 
}: AdaptationFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    justification: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (adaptation) {
      setFormData({
        description: adaptation.description,
        justification: adaptation.justification,
        date: adaptation.date.split('T')[0],
      });
    } else {
      setFormData({
        description: '',
        justification: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [adaptation, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.description || !formData.justification || !formData.date) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      let created: Adaptation | undefined;
      if (adaptation) {
        // Try remote update, but always persist locally
        try {
          await api.updateAdaptation(studentId, adaptation.id, {
            ...formData,
            date: new Date(formData.date).toISOString(),
          });
          toast.success('Adaptação atualizada com sucesso!');
        } catch (err) {
          // remote failure - still persist locally
        }
        const local = adaptationStorage.update(adaptation.id, {
          description: formData.description,
          justification: formData.justification,
          date: new Date(formData.date).toISOString(),
        });
        created = local || undefined;
      } else {
        // Try remote create, but always persist locally
        try {
          const res = await api.createAdaptation({
            ...formData,
            studentId,
            date: new Date(formData.date).toISOString(),
          });
          // If remote returned object, try to use its values when persisting locally
          if (res && (res as any).id) {
            // persist locally with remote id when possible
            created = adaptationStorage.create({
              id: (res as any).id,
              studentId,
              description: formData.description,
              justification: formData.justification,
              date: new Date(formData.date).toISOString(),
            } as any);
          } else {
            created = adaptationStorage.create({
              studentId,
              description: formData.description,
              justification: formData.justification,
              date: new Date(formData.date).toISOString(),
            } as any);
          }
          toast.success('Adaptação registrada com sucesso!');
        } catch (err) {
          // remote failed - persist locally
          created = adaptationStorage.create({
            studentId,
            description: formData.description,
            justification: formData.justification,
            date: new Date(formData.date).toISOString(),
          } as any);
          toast.success('Adaptação registrada localmente (offline)');
        }
      }
      onSuccess(created);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar adaptação');
      toast.error(err.message || 'Erro ao salvar adaptação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {adaptation ? 'Editar Adaptação Curricular' : 'Nova Adaptação Curricular'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição da Necessidade *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descreva a necessidade de adaptação curricular..."
              rows={4}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Referência ao Laudo ou Justificativa *</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => handleChange('justification', e.target.value)}
              placeholder="Laudo médico, parecer pedagógico ou justificativa..."
              rows={3}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data do Registro *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
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
              {loading ? 'Salvando...' : adaptation ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
