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
      <div className="flex items-center bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-1 shadow-sm transition">
        {/* Botão Diminuir Letra (A-) */}
        <button
          type="button"
          onClick={handleDiminuir}
          disabled={escala <= 100}
          title="Diminuir tamanho das letras (A-)"
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Indicador de Escala Atual / Abre Menu */}
        <button
          type="button"
          onClick={() => setMenuAberto(!menuAberto)}
          title="Ajustar tamanho das letras do sistema"
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold text-slate-200 hover:text-emerald-400 hover:bg-slate-700/60 transition cursor-pointer"
        >
          <Type className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono">{escala}%</span>
        </button>

        {/* Botão Aumentar Letra (A+) */}
        <button
          type="button"
          onClick={handleAumentar}
          disabled={escala >= 140}
          title="Aumentar tamanho das letras (A+)"
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Menu Flutuante de Seleção com os 4 Níveis */}
      {menuAberto && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setMenuAberto(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Tamanho da Fonte
              </span>
              <button
                type="button"
                onClick={() => handleSelecionarNivel(100)}
                className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                title="Restaurar padrão 100%"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>
            </div>

            <div className="space-y-1 pt-1.5">
              {OPCOES_ESCALA_FONTE.map(opcao => {
                const ativo = escala === opcao.nivel;
                return (
                  <button
                    key={opcao.nivel}
                    type="button"
                    onClick={() => handleSelecionarNivel(opcao.nivel)}
                    className={`w-full text-left p-2 rounded-xl text-xs transition flex items-center justify-between ${
                      ativo 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block font-medium">{opcao.rotulo}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">{opcao.descricao}</span>
                    </div>
                    {ativo && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
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
