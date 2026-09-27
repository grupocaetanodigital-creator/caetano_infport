import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  X, 
  Sparkles, 
  ShieldCheck, 
  WifiOff, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ModalInstalarAppPWAProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function ModalInstalarAppPWA({ aberto, onFechar }: ModalInstalarAppPWAProps) {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [instalando, setInstalando] = useState(false);
  const [sucessoInstalacao, setSucessoInstalacao] = useState(false);

  if (!aberto) return null;

  const handleInstalarNativo = async () => {
    setInstalando(true);
    try {
      const instalado = await install();
      if (instalado) {
        setSucessoInstalacao(true);
      }
    } finally {
      setInstalando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Instalar Aplicativo Oficial
              </h3>
              <p className="text-xs text-slate-400">
                PWA Nativo sem barra de navegador, com cache offline para guarita.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status: Já Instalado */}
        {(isStandalone || isInstalled || sucessoInstalacao) ? (
          <div className="bg-emerald-950/70 border border-emerald-500/50 p-5 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-sm text-emerald-300">
                Aplicativo Instalado com Sucesso!
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                O INFPORT 1.0 já está funcionando como aplicativo nativo do seu dispositivo. Você pode abri-lo direto da tela inicial ou do menu Iniciar.
              </p>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase transition shadow-md"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Vantagens de instalar como App em vez de atalho comum */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 inline-block mb-1">
                  <Monitor className="w-4 h-4" />
                </span>
                <strong className="block text-xs text-slate-200">Sem Barra URL</strong>
                <p className="text-[11px] text-slate-400 leading-snug">Visual limpo de software profissional em tela cheia.</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 inline-block mb-1">
                  <Zap className="w-4 h-4" />
                </span>
                <strong className="block text-xs text-slate-200">Abertura Rápida</strong>
                <p className="text-[11px] text-slate-400 leading-snug">Ícone oficial próprio sem recarregar navegador.</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 inline-block mb-1">
                  <WifiOff className="w-4 h-4" />
                </span>
                <strong className="block text-xs text-slate-200">Cache de Posto</strong>
                <p className="text-[11px] text-slate-400 leading-snug">Continua abrindo mesmo com instabilidade no sinal.</p>
              </div>
            </div>

            {/* CASO 1: ANDROID / CHROME / WINDOWS / EDGE (Instalação 1 Clique) */}
            {isInstallable && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase">
                    Instalação Automática Disponível
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Seu navegador é 100% compatível com a instalação direta. Clique no botão abaixo para adicionar o aplicativo oficial à sua área de trabalho ou gaveta de apps.
                </p>

                <button
                  type="button"
                  onClick={handleInstalarNativo}
                  disabled={instalando}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 px-4 rounded-xl text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition shadow-lg active:scale-[0.99] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {instalando ? 'Instalando...' : 'Instalar Aplicativo INFPORT 1.0'}
                </button>
              </div>
            )}

            {/* CASO 2: DISPOSITIVO APPLE (iOS Safari) */}
            {isIOS && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase">
                  <Share className="w-4 h-4 text-blue-400" />
                  Como instalar no iPhone ou iPad:
                </div>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <li className="leading-relaxed">
                    Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior do Safari.
                  </li>
                  <li className="leading-relaxed">
                    Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Toque em <strong>"Adicionar"</strong> no canto superior direito.
                  </li>
                </ol>
                <p className="text-[11px] text-slate-400 text-center">
                  O INFPORT abrirá sem a barra do Safari, com visual nativo de aplicativo!
                </p>
              </div>
            )}

            {/* CASO 3: NAVEGADOR DESKTOP SEM PROMPT DIRETO (Guia Rápido) */}
            {!isInstallable && !isIOS && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  Instalação no Computador da Portaria (Chrome / Edge):
                </div>
                <p className="text-xs text-slate-300">
                  Você pode instalar diretamente pela barra de endereço do seu navegador:
                </p>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Clique no ícone de <strong>"Instalar aplicativo"</strong> que fica no canto direito da barra de endereço (ao lado da estrela de favoritos).</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Ou clique no menu de 3 pontinhos do navegador &gt; <strong>Salvar e Compartilhar &gt; Instalar página como aplicativo</strong>.</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Fechar */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onFechar}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
