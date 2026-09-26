import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Se já estiver rodando como PWA instalado (standalone), ocultar
  if (isInstalled) {
    return null;
  }

  // Fluxo Chromium / Android / Desktop
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md transition active:scale-95"
        title="Instalar INFPORT como aplicativo na área de trabalho ou tela inicial"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App PWA</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  // Fluxo iOS Safari (WebKit não suporta beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-xs transition"
          title="Instalar no iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Instalar no iOS</span>
          <span className="sm:hidden">Instalar</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-emerald-400">
                  <Smartphone className="w-5 h-5" /> Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <p>Para usar o <strong>INFPORT 1.0</strong> em tela cheia com funcionamento offline na portaria:</p>
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">1</span>
                    <span>Toque no botão de <strong>Compartilhar</strong> (<Share2 className="w-3.5 h-3.5 inline mx-0.5" />) na barra do Safari.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">2</span>
                    <span>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">3</span>
                    <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-xs font-bold text-slate-950 transition uppercase"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
