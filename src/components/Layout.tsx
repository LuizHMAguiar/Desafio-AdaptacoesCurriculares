import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { GraduationCap, LogOut, User, Database } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { studentStorage, adaptationStorage, reportStorage } from '../lib/storage';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();

  const getRoleBadge = () => {
    if (user?.role === 'coordenador') {
      return <Badge variant="default">Coordenador</Badge>;
    }
    return <Badge variant="secondary">Professor</Badge>;
  };

  const handleResetData = () => {
    const keysToRemove = [
      'adaptacao_users',
      'adaptacao_students',
      'adaptacao_adaptations',
      'adaptacao_reports',
      'adaptacao_current_user',
      'setupComplete',
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <GraduationCap className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg">Sistema de Adaptações Curriculares</h1>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-gray-600" />
                  <div className="text-sm">
                    <div>{user.name}</div>
                    {getRoleBadge()}
                  </div>
                </div>
                {/*
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-gray-600"
                    >
                      <Database className="size-4" />
                      <span className="hidden sm:inline">Resetar Dados</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Resetar todos os dados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá excluir todos os estudantes, adaptações e relatos do sistema.
                        Os usuários padrão serão mantidos. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetData} className="bg-red-600 hover:bg-red-700">
                        Resetar Dados
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                      */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="size-4" />
                  Sair
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Database className="size-3" />
              <span>Armazenamento Local</span>
            </div>
            <div className="flex gap-4">
              <span>{studentStorage.getAll().length} estudantes</span>
              <span>{adaptationStorage.getAll().length} adaptações</span>
              <span>{reportStorage.getAll().length} relatos</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}