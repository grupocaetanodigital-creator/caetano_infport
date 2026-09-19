// Pasta: src/components/AlertaRondaGlobal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Timer, AlertTriangle, ShieldAlert, ArrowRight, X, BellOff } from 'lucide-react';

export default function AlertaRondaGlobal({ onNavegarRondas, usuarioLogado }) {
  const [tempoRestante, setTempoRestante] = useState(0);
  const [alertaDisparado, setAlertaDisparado] = useState(false);
  const [silenciadoAte, setSilenciadoAte] = useState(null);

  useEffect(() => {
    const checarTimer = async () => {
      // Se o alerta foi silenciado/adiado e o tempo de adiamento ainda não venceu, ignora
      if (silenciadoAte && new Date().getTime() < silenciadoAte) {
        setAlertaDisparado(false);
        return;
      }

      // Verifica no localStorage se há ronda em andamento
      const rondaAtiva = localStorage.getItem('infport_ronda_ativa');
      if (rondaAtiva === 'true') {
        setTempoRestante(0);
        setAlertaDisparado(false);
        return;
      }

      let dataUltimaRonda = null;

      // 1. Tenta buscar a última ronda diretamente no banco de dados do condomínio ativo
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
          console.error('Erro ao consultar rondas no Supabase:', e);
        }
      }

      // 2. Se não encontrou no banco, tenta o localStorage como fallback
      if (!dataUltimaRonda) {
        dataUltimaRonda = localStorage.getItem('infport_ultima_ronda_fim');
      }

      // Se não há nenhum registro de ronda anterior, não spama o alerta
      if (!dataUltimaRonda) {
        setTempoRestante(0);
        setAlertaDisparado(false);
        return;
      }

      const dataFim = new Date(dataUltimaRonda).getTime();
      const agora = new Date().getTime();

      // Caso a data seja inválida ou no futuro
      if (isNaN(dataFim)) {
        setTempoRestante(0);
        setAlertaDisparado(false);
        return;
      }

      const decorridoSegundos = Math.floor((agora - dataFim) / 1000);
      const limiteSegundos = 15 * 60; // 15 minutos
      const restante = limiteSegundos - decorridoSegundos;

      if (restante <= 0) {
        setTempoRestante(0);
        if (!alertaDisparado) {
          setAlertaDisparado(true);
          dispararAlertaSonoroContinuo();
        }
      } else {
        setTempoRestante(restante);
        setAlertaDisparado(false);
      }
    };

    checarTimer();
    const interval = setInterval(checarTimer, 5000); // Checa a cada 5 segundos

    const handleRondaEvent = () => checarTimer();
    window.addEventListener('ronda_finalizada', handleRondaEvent);
    window.addEventListener('ronda_iniciada', handleRondaEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ronda_finalizada', handleRondaEvent);
      window.removeEventListener('ronda_iniciada', handleRondaEvent);
    };
  }, [alertaDisparado, silenciadoAte, usuarioLogado?.condominio_id]);

  // Emitir alerta sonoro usando Web Audio API nativa do navegador
  const dispararAlertaSonoroContinuo = () => {
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
      console.log('Erro ao emitir áudio de alerta:', e);
    }
  };

  const formatarTempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Função para redirecionar para rondas e fechar/adiar o alerta
  const handleIrParaRondas = () => {
    setAlertaDisparado(false);
    // Adia por 10 minutos para dar tempo do operador iniciar a ronda sem a tela reabrir
    setSilenciadoAte(new Date().getTime() + 10 * 60 * 1000);
    if (onNavegarRondas) {
      onNavegarRondas();
    }
  };

  // Função para adiar/silenciar por 15 minutos
  const handleAdiar15Min = () => {
    setAlertaDisparado(false);
    setSilenciadoAte(new Date().getTime() + 15 * 60 * 1000);
  };

  if (!alertaDisparado && tempoRestante <= 0) return null;

  return (
    <>
      {/* BARRA SUPERIOR QUANDO O TEMPO ESTÁ CORRENDO */}
      {!alertaDisparado && tempoRestante > 0 && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between text-xs font-bold shadow-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 animate-spin" />
            <span>INTERVALO DE RONDA EM ANDAMENTO</span>
          </div>
          <div className="bg-slate-950 text-amber-400 font-mono px-3 py-0.5 rounded-lg text-sm">
            {formatarTempo(tempoRestante)}
          </div>
        </div>
      )}

      {/* MODAL POP-UP URGENTE DE EXPIRAÇÃO DE RONDA */}
      {alertaDisparado && (
        <div className="fixed inset-0 bg-red-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-center space-y-5 shadow-2xl border-4 border-red-600 relative animate-in fade-in zoom-in duration-200">
            
            {/* Botão de Fechar (X) no Canto Superior Direito */}
            <button
              onClick={handleAdiar15Min}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition"
              title="Fechar e adiar por 15 minutos"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 animate-pulse">
              <ShieldAlert className="w-12 h-12" />
            </div>

            <div>
              <span className="bg-red-100 text-red-800 text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                ALERTA DE SEGURANÇA PATRIMONIAL
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">HORA DE INICIAR A PRÓXIMA RONDA!</h2>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                Passaram-se <strong>15 minutos</strong> desde a conclusão da última ronda. Realize a varredura nos pontos cadastrados do condomínio.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center justify-center gap-2 text-red-700 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Ação obrigatória do vigia / portaria no plantão!</span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleIrParaRondas}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-sm uppercase flex items-center justify-center gap-2 transition shadow-lg active:scale-95"
              >
                IR PARA TELA DE RONDAS E INICIAR <ArrowRight className="w-5 h-5" />
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
