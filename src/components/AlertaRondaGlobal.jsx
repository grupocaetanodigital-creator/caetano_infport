// Pasta: src/components/AlertaRondaGlobal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Timer, ShieldAlert, QrCode, X, BellOff, ArrowRight, AlertTriangle, PlayCircle } from 'lucide-react';

export default function AlertaRondaGlobal({ onNavegarRondas, usuarioLogado }) {
  const [tempoRestante, setTempoRestante] = useState(15 * 60); // 15 minutos em segundos
  const [tempoAtrasado, setTempoAtrasado] = useState(0);
  const [statusRonda, setStatusRonda] = useState('aguardando'); // 'aguardando', 'atrasada', 'em_andamento'
  const [alertaDisparado, setAlertaDisparado] = useState(false);
  const [silenciadoAte, setSilenciadoAte] = useState(null);

  useEffect(() => {
    const checarStatusRonda = async () => {
      // 1. Verifica se há ronda em andamento
      const rondaAtiva = localStorage.getItem('infport_ronda_ativa');
      if (rondaAtiva === 'true') {
        setStatusRonda('em_andamento');
        setAlertaDisparado(false);
        return;
      }

      let dataUltimaRonda = null;

      // 2. Busca a última ronda no Supabase para o condomínio logado
      if (usuarioLogado?.condominio_id) {
        try {
          const { data } = await supabase
            .from('rondas_execucao')
            .select('created_at, fim_execucao')
            .eq('condominio_id', usuarioLogado.condominio_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            dataUltimaRonda = data[0].fim_execucao || data[0].created_at;
          }
        } catch (e) {
          console.error('Erro ao consultar histórico de rondas:', e);
        }
      }

      // 3. Fallback no localStorage caso esteja offline ou sem registro no banco
      if (!dataUltimaRonda) {
        dataUltimaRonda = localStorage.getItem('infport_ultima_ronda_fim');
      }

      // Se nunca foi feita nenhuma ronda, inicia contagem padrão de 15 min
      if (!dataUltimaRonda) {
        const tempoInicial = localStorage.getItem('infport_inicio_timer_padrao');
        if (!tempoInicial) {
          const agoraStr = new Date().toISOString();
          localStorage.setItem('infport_inicio_timer_padrao', agoraStr);
          dataUltimaRonda = agoraStr;
        } else {
          dataUltimaRonda = tempoInicial;
        }
      }

      const dataFim = new Date(dataUltimaRonda).getTime();
      const agora = new Date().getTime();

      if (isNaN(dataFim)) {
        setStatusRonda('aguardando');
        setTempoRestante(15 * 60);
        return;
      }

      const decorridoSegundos = Math.floor((agora - dataFim) / 1000);
      const limiteSegundos = 15 * 60; // 15 minutos
      const restante = limiteSegundos - decorridoSegundos;

      if (restante <= 0) {
        // Ronda Atrasada
        setStatusRonda('atrasada');
        setTempoRestante(0);
        setTempoAtrasado(Math.abs(restante));

        // Dispara o Popup apenas se não estiver silenciado/adiado
        if (!silenciadoAte || agora >= silenciadoAte) {
          if (!alertaDisparado) {
            setAlertaDisparado(true);
            dispararBeepSonoro();
          }
        }
      } else {
        // Em contagem regressiva normal
        setStatusRonda('aguardando');
        setTempoRestante(restante);
        setTempoAtrasado(0);
        setAlertaDisparado(false);
      }
    };

    checarStatusRonda();
    const interval = setInterval(checarStatusRonda, 1000); // Atualiza a cada 1 segundo para efeito do cronômetro

    const handleRondaEvent = () => checarStatusRonda();
    window.addEventListener('ronda_finalizada', handleRondaEvent);
    window.addEventListener('ronda_iniciada', handleRondaEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ronda_finalizada', handleRondaEvent);
      window.removeEventListener('ronda_iniciada', handleRondaEvent);
    };
  }, [alertaDisparado, silenciadoAte, usuarioLogado?.condominio_id]);

  const dispararBeepSonoro = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      
      const emitirBeep = (freq, duracao) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duracao);
      };

      emitirBeep(880, 0.2);
      setTimeout(() => emitirBeep(880, 0.2), 300);
      setTimeout(() => emitirBeep(1100, 0.4), 600);
    } catch (e) {
      console.log('Erro ao emitir sinal sonoro:', e);
    }
  };

  const formatarTempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const handleIrParaRondas = () => {
    setAlertaDisparado(false);
    setSilenciadoAte(new Date().getTime() + 10 * 60 * 1000); // Silencia o popup por 10 min para não reabrir enquanto faz a ronda
    if (onNavegarRondas) {
      onNavegarRondas();
    }
  };

  const handleAdiar15Min = () => {
    setAlertaDisparado(false);
    setSilenciadoAte(new Date().getTime() + 15 * 60 * 1000);
  };

  return (
    <>
      {/* 1. BARRA SUPERIOR FIXA PERMANENTE DE CRONÔMETRO (NÃO BLOQUEANTE) */}
      <div className={`w-full px-3 py-2 flex items-center justify-between text-xs font-bold shadow-md sticky top-0 z-40 transition-colors ${
        statusRonda === 'em_andamento'
          ? 'bg-emerald-600 text-white'
          : statusRonda === 'atrasada'
          ? 'bg-red-600 text-white animate-pulse'
          : 'bg-amber-500 text-slate-950'
      }`}>
        <div className="flex items-center gap-2 truncate">
          {statusRonda === 'em_andamento' ? (
            <>
              <PlayCircle className="w-4 h-4 animate-spin text-emerald-200 shrink-0" />
              <span className="truncate">RONDA EM ANDAMENTO NO CONDOMÍNIO</span>
            </>
          ) : statusRonda === 'atrasada' ? (
            <>
              <ShieldAlert className="w-4 h-4 text-white shrink-0" />
              <span className="truncate">⚠️ RONDA PATRIMONIAL PENDENTE / ATRASADA</span>
            </>
          ) : (
            <>
              <Timer className="w-4 h-4 animate-spin text-slate-900 shrink-0" />
              <span className="truncate">PRÓXIMA RONDA EM:</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-slate-950 text-white font-mono px-2.5 py-1 rounded-lg text-xs sm:text-sm border border-slate-700">
            {statusRonda === 'em_andamento'
              ? 'EM MARCHA'
              : statusRonda === 'atrasada'
              ? `+${formatarTempo(tempoAtrasado)}`
              : formatarTempo(tempoRestante)}
          </div>

          <button
            onClick={handleIrParaRondas}
            className={`px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase transition flex items-center gap-1 shadow-sm ${
              statusRonda === 'atrasada'
                ? 'bg-white text-red-700 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Acessar</span> Rondas
          </button>
        </div>
      </div>

      {/* 2. JANELA MODAL DE ALERTA DE URGÊNCIA (EXIBIDA SE VENCIDO O TEMPO) */}
      {alertaDisparado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl border-4 border-red-600 relative animate-in zoom-in-95 duration-150">
            
            <button
              onClick={handleAdiar15Min}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition"
              title="Fechar janela de alerta"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div>
              <span className="bg-red-100 text-red-800 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider border border-red-200">
                Alerta de Segurança Patrimonial
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 uppercase leading-tight">
                Hora de Iniciar a Próxima Ronda!
              </h2>
              <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                Passaram-se mais de <strong>15 minutos</strong> desde a última ronda. Realize a varredura nos pontos cadastrados da portaria.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center justify-center gap-2 text-red-700 text-xs font-bold text-left">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
              <span>Ação obrigatória do vigia / portaria no plantão!</span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleIrParaRondas}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition shadow-lg active:scale-95"
              >
                IR PARA TELA DE RONDAS E INICIAR <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleAdiar15Min}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 transition"
              >
                <BellOff className="w-4 h-4 text-slate-500" />
                Lembrar mais tarde (Adiar 15 min)
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
