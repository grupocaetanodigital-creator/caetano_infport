import React, { useState, useEffect } from 'react';
import { Type, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';
import { 
  obterEscalaFonteAtual, 
  aplicarEscalaFonte, 
  aumentarFonte, 
  diminuirFonte, 
  NivelEscalaFonte, 
  OPCOES_ESCALA_FONTE 
} from '../services/fontScaleService';

export default function ControleFonteAcessibilidade() {
  const [escala, setEscala] = useState<NivelEscalaFonte>(100);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    setEscala(obterEscalaFonteAtual());

    const handleMudanca = (e: any) => {
      if (e.detail?.escala) {
        setEscala(e.detail.escala);
      }
    };

    window.addEventListener('infport_escala_fonte_alterada', handleMudanca);
    return () => window.removeEventListener('infport_escala_fonte_alterada', handleMudanca);
  }, []);

  const handleAumentar = () => {
    const nova = aumentarFonte();
    setEscala(nova);
  };

  const handleDiminuir = () => {
    const nova = diminuirFonte();
    setEscala(nova);
  };

  const handleSelecionarNivel = (nivel: NivelEscalaFonte) => {
    aplicarEscalaFonte(nivel);
    setEscala(nivel);
    setMenuAberto(false);
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Botão Compacto Elegante: Tipo e Porcentagem */}
      <button
        type="button"
        onClick={() => setMenuAberto(!menuAberto)}
        title="Ajustar tamanho da fonte do sistema"
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-emerald-400 text-xs font-bold transition cursor-pointer"
      >
        <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-mono text-[11px]">{escala}%</span>
      </button>

      {/* Menu Flutuante de Seleção com os 4 Níveis e Controles Rápidos */}
      {menuAberto && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setMenuAberto(false)} 
          />
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Tamanho da Fonte
              </span>
              <button
                type="button"
                onClick={() => handleSelecionarNivel(100)}
                className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
                title="Restaurar padrão 100%"
              >
                <RotateCcw className="w-2.5 h-2.5" /> 100%
              </button>
            </div>

            {/* Botoes Rapidos Menos / Mais */}
            <div className="flex items-center justify-between gap-1 p-1 bg-slate-800/60 rounded-lg my-1.5">
              <button
                type="button"
                onClick={handleDiminuir}
                disabled={escala <= 100}
                className="flex-1 py-1 rounded text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" /> A-
              </button>
              <span className="text-xs font-mono font-bold text-emerald-400 px-1">{escala}%</span>
              <button
                type="button"
                onClick={handleAumentar}
                disabled={escala >= 140}
                className="flex-1 py-1 rounded text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" /> A+
              </button>
            </div>

            <div className="space-y-1">
              {OPCOES_ESCALA_FONTE.map(opcao => {
                const ativo = escala === opcao.nivel;
                return (
                  <button
                    key={opcao.nivel}
                    type="button"
                    onClick={() => handleSelecionarNivel(opcao.nivel)}
                    className={`w-full text-left px-2 py-1 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                      ativo 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{opcao.rotulo}</span>
                    {ativo && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
