import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { obterModoAltoContraste, aplicarModoAltoContraste } from '../services/contrasteService';

interface SeletorModoContrasteProps {
  className?: string;
  onAlternar?: (novoValor: boolean) => void;
  variante?: 'escuro' | 'claro';
}

export default function SeletorModoContraste({ 
  className = '', 
  onAlternar,
  variante = 'escuro'
}: SeletorModoContrasteProps) {
  const [altoContraste, setAltoContraste] = useState<boolean>(() => obterModoAltoContraste());

  useEffect(() => {
    const handleEvento = (e: any) => {
      if (e.detail?.altoContraste !== undefined) {
        setAltoContraste(e.detail.altoContraste);
      }
    };

    window.addEventListener('infport_contraste_alterado', handleEvento);
    return () => window.removeEventListener('infport_contraste_alterado', handleEvento);
  }, []);

  const handleToggle = (novoValor: boolean) => {
    setAltoContraste(novoValor);
    aplicarModoAltoContraste(novoValor);
    if (onAlternar) {
      onAlternar(novoValor);
    }
  };

  const containerEstilo = variante === 'claro'
    ? 'bg-slate-100 border border-slate-200'
    : 'bg-slate-800/90 border border-slate-700';

  const botaoInativoEstilo = variante === 'claro'
    ? 'text-slate-600 hover:text-slate-900'
    : 'text-slate-400 hover:text-slate-200';

  return (
    <div 
      className={`inline-flex items-center gap-1 p-1 rounded-lg shrink-0 ${containerEstilo} ${className}`}
      role="group"
      aria-label="Controle de Contraste"
    >
      <button
        type="button"
        onClick={() => handleToggle(false)}
        title="Ativar modo escuro padrão do sistema"
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
          !altoContraste
            ? 'bg-slate-900 text-white shadow-xs border border-slate-700/80'
            : botaoInativoEstilo
        }`}
      >
        <Moon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Escuro</span>
      </button>

      <button
        type="button"
        onClick={() => handleToggle(true)}
        title="Ativar modo de alto contraste para guarita com forte iluminação"
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
          altoContraste
            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
            : botaoInativoEstilo
        }`}
      >
        <Sun className={`w-3.5 h-3.5 shrink-0 ${altoContraste ? 'text-slate-950' : 'text-amber-400'}`} />
        <span>Contraste</span>
      </button>
    </div>
  );
}
