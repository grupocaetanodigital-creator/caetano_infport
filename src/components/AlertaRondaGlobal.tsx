import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { registrarAtividade } from '../services/auditoriaService';
import { 
  Timer, 
  ShieldAlert, 
  QrCode, 
  X, 
  BellOff, 
  ArrowRight, 
  AlertTriangle, 
  PlayCircle,
  VolumeX,
  Volume2,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';

interface AlertaRondaGlobalProps {
  onNavegarRondas?: () => void;
  usuarioLogado?: any;
  condominioId?: string;
  condominioAtivo?: any;
}

const CHAVE_MUTE_ADM = 'infport_mute_alerta_ronda_adm_v1';

export default function AlertaRondaGlobal({ onNavegarRondas, usuarioLogado, condominioId, condominioAtivo }: AlertaRondaGlobalProps) {
  const idCondominioAtivo = condominioId || condominioAtivo?.id || usuarioLogado?.condominio_id || usuarioLogado?.condominio?.id;
  const eAdmin = usuarioLogado?.perfil === 'admin' || usuarioLogado?.nivel_acesso === 0 || usuarioLogado?.perfil === 'master' || usuarioLogado?.nivel_acesso === 1;

  const [moduloRondaAtivo, setModuloRondaAtivo] = useState(true);
  const [tempoRestante, setTempoRestante] = useState(15 * 60);
  const [tempoAtrasado, setTempoAtrasado] = useState(0);
  const [statusRonda, setStatusRonda] = useState<'aguardando' | 'atrasada' | 'em_andamento'>('aguardando');
  const [alertaDisparado, setAlertaDisparado] = useState(false);
  const [silenciadoAte, setSilenciadoAte] = useState<number | null>(null);

  // Controle de Mute exclusivo para Administrador
  const [muteAdmTimestamp, setMuteAdmTimestamp] = useState<number | null>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_MUTE_ADM);
      if (salvo) {
        const val = parseInt(salvo, 10);
        if (val > Date.now()) return val;
      }
    } catch {}
    return null;
  });
  const [modalMuteAberto, setModalMuteAberto] = useState(false);

  const proximaRondaTimestampRef = useRef<number | null>(null);
  const rondaEmAndamentoRef = useRef(false);

  // Calcula se o mute de administrador está ativo agora
  const muteAdmAtivo = muteAdmTimestamp !== null && muteAdmTimestamp > Date.now();
  const minutosRestantesMute = muteAdmTimestamp ? Math.max(0, Math.ceil((muteAdmTimestamp - Date.now()) / 60000)) : 0;

  useEffect(() => {
    if (!idCondominioAtivo) {
      setModuloRondaAtivo(true);
      return;
    }

    let isMounted = true;

    const verificarEAtualizarAlerta = async () => {
      try {
        const { data: configData, error: configError } = await supabase
          .from('configuracoes')
          .select('mod07_gestao_ronda, feature_flags')
          .eq('condominio_id', idCondominioAtivo)
          .maybeSingle();

        let estaAtivo = true;

        if (!configError && configData) {
          if (configData.mod07_gestao_ronda !== undefined && configData.mod07_gestao_ronda !== null) {
            estaAtivo = Boolean(configData.mod07_gestao_ronda);
          } else if (configData.feature_flags && typeof configData.feature_flags === 'object') {
            const flags = configData.feature_flags as Record<string, any>;
            estaAtivo = Boolean(flags.mod07_gestao_ronda ?? true);
          }
        }

        if (!isMounted) return;
        setModuloRondaAtivo(estaAtivo);

        if (!estaAtivo) {
          setAlertaDisparado(false);
          return;
        }
      } catch (err) {
        console.error('Erro ao checar status do Módulo 07 no Supabase:', err);
      }
    };

    verificarEAtualizarAlerta();

    const intervalConfig = setInterval(verificarEAtualizarAlerta, 30000);
    return () => {
      isMounted = false;
      clearInterval(intervalConfig);
    };
  }, [idCondominioAtivo]);

  // Monitoramento contínuo das rondas
  useEffect(() => {
    if (!moduloRondaAtivo || !idCondominioAtivo) return;

    let isMounted = true;

    const checarStatusBanco = async () => {
      try {
        // Checa se há ronda em andamento
        const { data: emAndamento } = await supabase
          .from('rondas_execucao')
          .select('id, hora_inicio')
          .eq('condominio_id', idCondominioAtivo)
          .is('hora_fim', null)
          .order('hora_inicio', { ascending: false })
          .limit(1);

        if (!isMounted) return;

        if (emAndamento && emAndamento.length > 0) {
          rondaEmAndamentoRef.current = true;
          setStatusRonda('em_andamento');
          setAlertaDisparado(false);
          return;
        }

        rondaEmAndamentoRef.current = false;

        // Busca última ronda finalizada
        const { data: ultimaRonda } = await supabase
          .from('rondas_execucao')
          .select('id, hora_fim')
          .eq('condominio_id', idCondominioAtivo)
          .not('hora_fim', 'is', null)
          .order('hora_fim', { ascending: false })
          .limit(1);

        if (!isMounted) return;

        let baseTimestamp = Date.now();
        if (ultimaRonda && ultimaRonda.length > 0 && ultimaRonda[0].hora_fim) {
          baseTimestamp = new Date(ultimaRonda[0].hora_fim).getTime();
        }

        // Intervalo de 15 minutos entre rondas
        const proxima = baseTimestamp + 15 * 60 * 1000;
        proximaRondaTimestampRef.current = proxima;
      } catch (e) {
        console.error('Erro ao checar rondas:', e);
      }
    };

    checarStatusBanco();
    const intervalBanco = setInterval(checarStatusBanco, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalBanco);
    };
  }, [moduloRondaAtivo, idCondominioAtivo]);

  // Timer do relógio
  useEffect(() => {
    if (!moduloRondaAtivo) return;

    const timerInterval = setInterval(() => {
      if (rondaEmAndamentoRef.current) {
        setStatusRonda('em_andamento');
        setAlertaDisparado(false);
        return;
      }

      const agora = Date.now();
      const proxima = proximaRondaTimestampRef.current || (agora + 15 * 60 * 1000);
      const diffSegundos = Math.floor((proxima - agora) / 1000);

      // Checa se o mute do ADM expirou
      if (muteAdmTimestamp && agora >= muteAdmTimestamp) {
        setMuteAdmTimestamp(null);
        localStorage.removeItem(CHAVE_MUTE_ADM);
      }

      if (diffSegundos > 0) {
        setStatusRonda('aguardando');
        setTempoRestante(diffSegundos);
        setTempoAtrasado(0);
        setAlertaDisparado(false);
      } else {
        setStatusRonda('atrasada');
        setTempoRestante(0);
        setTempoAtrasado(Math.abs(diffSegundos));

        // Se o ADM estiver com mute ativo ou se estiver adiado temporariamente
        const estaSilenciado = (silenciadoAte && agora < silenciadoAte) || (muteAdmTimestamp && agora < muteAdmTimestamp);

        if (!estaSilenciado) {
          setAlertaDisparado(true);
          dispararBeepSonoro();
        } else {
          setAlertaDisparado(false);
        }
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [moduloRondaAtivo, silenciadoAte, muteAdmTimestamp]);

  const dispararBeepSonoro = () => {
    // Se o Administrador silenciou o alerta, não emite nenhum som
    if (muteAdmTimestamp && Date.now() < muteAdmTimestamp) {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();

      const emitirBeep = (freq: number, duracao: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
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

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const handleIrParaRondas = () => {
    setAlertaDisparado(false);
    setSilenciadoAte(new Date().getTime() + 10 * 60 * 1000);
    if (onNavegarRondas) {
      onNavegarRondas();
    }
  };

  const handleAdiar15Min = () => {
    setAlertaDisparado(false);
    setSilenciadoAte(new Date().getTime() + 15 * 60 * 1000);
  };

  // Funções de Mute do Administrador
  const aplicarMuteAdm = async (minutos: number) => {
    const ate = Date.now() + minutos * 60 * 1000;
    setMuteAdmTimestamp(ate);
    localStorage.setItem(CHAVE_MUTE_ADM, ate.toString());
    setAlertaDisparado(false);
    setModalMuteAberto(false);

    // Registra na auditoria do Histórico Absoluto
    const opNome = usuarioLogado?.nome || usuarioLogado?.login || 'Administrador';
    await registrarAtividade({
      modulo: 'Rondas',
      acao: 'MUTE_ALERTA',
      descricao: `Administrador ${opNome} silenciou o alerta sonoro de ronda por ${minutos} minutos.`,
      detalhes: {
        duracaoMinutos: minutos,
        silenciadoAte: new Date(ate).toISOString(),
        operador: opNome
      },
      operador_nome: opNome,
      operador_id: usuarioLogado?.id,
      operador_login: usuarioLogado?.login,
      condominio_id: idCondominioAtivo
    });
  };

  const desativarMuteAdm = async () => {
    setMuteAdmTimestamp(null);
    localStorage.removeItem(CHAVE_MUTE_ADM);
    setModalMuteAberto(false);

    const opNome = usuarioLogado?.nome || usuarioLogado?.login || 'Administrador';
    await registrarAtividade({
      modulo: 'Rondas',
      acao: 'MUTE_ALERTA',
      descricao: `Administrador ${opNome} reativou os alertas sonoros de ronda.`,
      detalhes: { status: 'reativado', operador: opNome },
      operador_nome: opNome,
      operador_id: usuarioLogado?.id,
      operador_login: usuarioLogado?.login,
      condominio_id: idCondominioAtivo
    });
  };

  if (!moduloRondaAtivo) {
    return null;
  }

  return (
    <>
      <div className={`w-full px-3 py-1 flex items-center justify-between text-[11px] font-bold shadow-xs sticky top-0 z-40 transition-colors ${
        statusRonda === 'em_andamento'
          ? 'bg-emerald-600 text-white'
          : statusRonda === 'atrasada'
          ? 'bg-red-600 text-white'
          : 'bg-amber-500 text-slate-950'
      }`}>
        <div className="flex items-center gap-2 truncate">
          {statusRonda === 'em_andamento' ? (
            <>
              <PlayCircle className="w-3.5 h-3.5 animate-spin text-emerald-200 shrink-0" />
              <span className="truncate">Ronda em Andamento</span>
            </>
          ) : statusRonda === 'atrasada' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="truncate">Ronda Atrasada / Pendente</span>
            </>
          ) : (
            <>
              <Timer className="w-3.5 h-3.5 text-slate-900 shrink-0" />
              <span className="truncate">Próxima Ronda</span>
            </>
          )}

          {/* Indicador de Mute ADM Ativo */}
          {muteAdmAtivo && (
            <span 
              onClick={() => eAdmin && setModalMuteAberto(true)}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950/80 text-amber-300 border border-amber-400/40 cursor-pointer shadow-xs"
              title="Clique para gerenciar o silenciamento de alerta"
            >
              <VolumeX className="w-3 h-3 text-amber-400" />
              <span>Mudo ADM ({minutosRestantesMute}m)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="bg-slate-950 text-white font-mono px-2 py-0.5 rounded text-[10px] sm:text-xs border border-slate-700">
            {statusRonda === 'em_andamento'
              ? 'EM MARCHA'
              : statusRonda === 'atrasada'
              ? `+${formatarTempo(tempoAtrasado)}`
              : formatarTempo(tempoRestante)}
          </div>

          {/* BOTÃO EXCLUSIVO DE MUTE PARA ADMINISTRADOR (ADM) */}
          {eAdmin && (
            <button
              type="button"
              onClick={() => setModalMuteAberto(true)}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition flex items-center gap-1 shadow-xs cursor-pointer ${
                muteAdmAtivo
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 border border-amber-500'
                  : 'bg-slate-900/90 text-slate-200 hover:bg-slate-950 border border-slate-700'
              }`}
              title="Silenciar / Mutar alertas de ronda (Acesso exclusivo para Administrador)"
            >
              {muteAdmAtivo ? <VolumeX className="w-3 h-3 text-slate-950" /> : <Volume2 className="w-3 h-3" />}
              <span className="hidden md:inline">Mute ADM</span>
            </button>
          )}

          <button
            onClick={handleIrParaRondas}
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition flex items-center gap-1 shadow-xs cursor-pointer ${
              statusRonda === 'atrasada'
                ? 'bg-white text-red-700 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-3 h-3" />
            <span>Rondas</span>
          </button>
        </div>
      </div>

      {/* POPUP DE ALERTA DE RONDA ATRASADA */}
      {alertaDisparado && !muteAdmAtivo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl border-4 border-red-600 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={handleAdiar15Min}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition cursor-pointer"
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
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition shadow-lg active:scale-95 cursor-pointer"
              >
                IR PARA TELA DE RONDAS E INICIAR <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleAdiar15Min}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <BellOff className="w-4 h-4 text-slate-500" />
                Lembrar mais tarde (Adiar 15 min)
              </button>

              {/* Botão de Mute Direto para ADM no Modal de Alerta */}
              {eAdmin && (
                <button
                  type="button"
                  onClick={() => setModalMuteAberto(true)}
                  className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-black py-2.5 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 transition border border-amber-300 cursor-pointer"
                >
                  <VolumeX className="w-4 h-4 text-amber-700" />
                  Silenciar Alerta de Ronda (Exclusivo ADM)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUSIVO DE GERENCIAMENTO DE MUTE PARA O ADMINISTRADOR */}
      {modalMuteAberto && eAdmin && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                  <VolumeX className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white uppercase tracking-tight">
                    Mute de Ronda (ADM)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Controle exclusivo de administrador
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalMuteAberto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Silencie os avisos sonoros e popups de ronda atrasada durante reuniões, manutenções ou períodos autorizados pelo síndico.
            </p>

            {muteAdmAtivo ? (
              <div className="bg-amber-950/60 border border-amber-500/40 p-3.5 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span>Mute ativo no momento:</span>
                  <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                    {minutosRestantesMute} minutos restantes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={desativarMuteAdm}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Reativar Alertas Sonoros Agora</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-slate-400 uppercase">
                  Escolha a duração do silenciamento:
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(15)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    15 minutos
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(30)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    30 minutos
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(60)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    1 hora
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarMuteAdm(240)}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                  >
                    4 horas
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalMuteAberto(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
