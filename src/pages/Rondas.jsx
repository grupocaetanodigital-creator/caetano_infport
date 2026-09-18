import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  ShieldCheck, 
  QrCode, 
  MapPin, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  Camera, 
  Navigation, 
  Clock, 
  Flag,
  AlertTriangle,
  MessageCircle,
  ExternalLink,
  UserCheck,
  History,
  Timer,
  ArrowRightLeft,
  Lock,
  User
} from 'lucide-react';

export default function Rondas({ usuarioLogado }) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Operador Ativo no Posto
  const [operadorRondaAtual, setOperadorRondaAtual] = useState(
    usuarioLogado?.nome || usuarioLogado?.login || 'Vigia / Portaria'
  );

  // Lista de Operadores Cadastrados para Seleção no Login
  const [listaOperadores, setListaOperadores] = useState([]);

  // Listagens de Rondas
  const [pontos, setPontos] = useState([]);
  const [rondaAtiva, setRondaAtiva] = useState(null);
  const [registrosRonda, setRegistrosRonda] = useState([]);
  const [historicoRondas, setHistoricoRondas] = useState([]);
  const [historicoPassagens, setHistoricoPassagens] = useState([]);

  // Temporizador de 15 Minutos (900 segundos)
  const [tempoRestanteTimer, setTempoRestanteTimer] = useState(0);
  const [timerAtivo, setTimerAtivo] = useState(false);

  // Modais
  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [modalRegistrarPonto, setModalRegistrarPonto] = useState(null);
  const [modalAssumirPosto, setModalAssumirPosto] = useState(false);
  const [whatsAppRelatorio, setWhatsAppRelatorio] = useState(null);

  // Form Novo Ponto
  const [nomePonto, setNomePonto] = useState('');
  const [codigoTag, setCodigoTag] = useState('');
  const [descricaoPonto, setDescricaoPonto] = useState('');

  // Form Leitura de Ponto
  const [codigoLido, setCodigoLido] = useState('');
  const [observacaoPonto, setObservacaoPonto] = useState('');
  const [fotoPontoUrl, setFotoPontoUrl] = useState('');
  const [coords, setCoords] = useState(null);

  // Form Assumir Posto (Login Obrigatório)
  const [operadorSelecionadoId, setOperadorSelecionadoId] = useState('');
  const [senhaLoginEntrante, setSenhaLoginEntrante] = useState('');
  const [ocorrenciasPlantao, setOcorrenciasPlantao] = useState('');

  useEffect(() => {
    carregarPontos();
    verificarRondaAtiva();
    carregarHistorico();
    carregarPassagensPosto();
    carregarOperadores();
  }, []);

  // Efeito do Temporizador de 15 Minutos com Alerta Sonoro
  useEffect(() => {
    let interval = null;
    if (timerAtivo && tempoRestanteTimer > 0) {
      interval = setInterval(() => {
        setTempoRestanteTimer((prev) => prev - 1);
      }, 1000);
    } else if (tempoRestanteTimer === 0 && timerAtivo) {
      setTimerAtivo(false);
      dispararAlertaSonoro();
    }
    return () => clearInterval(interval);
  }, [timerAtivo, tempoRestanteTimer]);

  // Alerta Sonoro usando Web Audio API Nativa do Navegador
  const dispararAlertaSonoro = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Tom A5
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.log('Erro ao emitir áudio:', e);
    }
  };

  const formatarTempoTimer = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const carregarOperadores = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('operadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setListaOperadores(data || []);
    } catch (err) {
      console.error('Erro ao carregar operadores:', err.message);
    }
  };

  const carregarPontos = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_pontos')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome_ponto');

      if (error) throw error;
      setPontos(data || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const verificarRondaAtiva = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'Em Andamento')
        .maybeSingle();

      if (error) throw error;
      setRondaAtiva(data);

      if (data) {
        if (data.operador_nome) setOperadorRondaAtual(data.operador_nome);
        carregarRegistrosRonda(data.id);
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarRegistrosRonda = async (rondaId) => {
    try {
      const { data, error } = await supabase
        .from('rondas_registros')
        .select('*, rondas_pontos(*)')
        .eq('ronda_id', rondaId);

      if (error) throw error;
      setRegistrosRonda(data || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarHistorico = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .neq('status', 'Em Andamento')
        .order('data_inicio', { ascending: false })
        .limit(15);

      if (error) throw error;
      setHistoricoRondas(data || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarPassagensPosto = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_passagem_posto')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('data_hora', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistoricoPassagens(data || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const capturarGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setMensagem({ tipo: 'erro', texto: 'Não foi possível capturar a geolocalização GPS.' })
      );
    }
  };

  const uploadFoto = async (file) => {
    if (!file) return;
    setUploadingFoto(true);

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `rondas_evidencias/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('encomendas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encomendas')
        .getPublicUrl(fileName);

      setFotoPontoUrl(urlData.publicUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto do ponto anexada com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const cadastrarPonto = async (e) => {
    e.preventDefault();
    if (!nomePonto.trim() || !codigoTag.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome do ponto e o código do QR Code / NFC.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('rondas_pontos')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          nome_ponto: nomePonto.trim(),
          codigo_tag: codigoTag.trim().toUpperCase(),
          localizacao_descricao: descricaoPonto.trim()
        }]);

      if (error) throw error;

      setNomePonto(''); setCodigoTag(''); setDescricaoPonto(''); setModalNovoPonto(false);
      carregarPontos();
      setMensagem({ tipo: 'sucesso', texto: 'Ponto de ronda cadastrado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const iniciarRonda = async () => {
    if (pontos.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Cadastre ao menos um ponto antes de iniciar a ronda.' });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          operador_nome: operadorRondaAtual,
          status: 'Em Andamento',
          data_inicio: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setRondaAtiva(data);
      setRegistrosRonda([]);
      setWhatsAppRelatorio(null);
      setMensagem({ tipo: 'sucesso', texto: 'Ronda iniciada! Percorra os pontos cadastrados.' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirRegistroPonto = (ponto) => {
    setModalRegistrarPonto(ponto);
    setCodigoLido('');
    setObservacaoPonto('');
    setFotoPontoUrl('');
    capturarGPS();
  };

  const confirmarLeituraPonto = async (e) => {
    e.preventDefault();
    if (codigoLido.trim().toUpperCase() !== modalRegistrarPonto.codigo_tag.toUpperCase()) {
      setMensagem({ tipo: 'erro', texto: 'Código lido incorreto! Não corresponde a este ponto.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('rondas_registros')
        .insert([{
          ronda_id: rondaAtiva.id,
          ponto_id: modalRegistrarPonto.id,
          condominio_id: usuarioLogado.condominio_id,
          data_hora: new Date().toISOString(),
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          foto_evidencia_url: fotoPontoUrl.trim() || '',
          observacao: observacaoPonto.trim() || ''
        }]);

      if (error) throw error;

      setModalRegistrarPonto(null);
      carregarRegistrosRonda(rondaAtiva.id);
      setMensagem({ tipo: 'sucesso', texto: `Ponto "${modalRegistrarPonto.nome_ponto}" registrado com sucesso!` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const finalizarRonda = async () => {
    if (!rondaAtiva) return;
    setLoading(true);

    const dataFim = new Date();
    const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
    const todosLidos = pontos.every(p => pontosLidosIds.includes(p.id));
    const statusFinal = todosLidos ? 'Concluída' : 'Incompleta';

    const lidosNomes = registrosRonda.map(r => `• ${r.rondas_pontos?.nome_ponto || 'Ponto'} (${new Date(r.data_hora).toLocaleTimeString('pt-BR')})`).join('\n');
    const zeradosNomes = pontos.filter(p => !pontosLidosIds.includes(p.id)).map(p => `• ${p.nome_ponto}`).join('\n');
    const fotosEvidencias = registrosRonda.filter(r => r.foto_evidencia_url).map(r => `📷 ${r.rondas_pontos?.nome_ponto}: ${r.foto_evidencia_url}`).join('\n');

    const resumoTexto = `🛡️ *RELATÓRIO PATRIMONIAL DE RONDA*\n` +
      `👤 Ronda: ${operadorRondaAtual}\n` +
      `⏱️ Início: ${new Date(rondaAtiva.data_inicio).toLocaleString('pt-BR')}\n` +
      `🏁 Fim: ${dataFim.toLocaleString('pt-BR')}\n` +
      `📊 Status: ${statusFinal.toUpperCase()} (${registrosRonda.length}/${pontos.length})\n\n` +
      `✅ *PONTOS VALIDADOS:*\n${lidosNomes || 'Nenhum'}\n\n` +
      (zeradosNomes ? `⚠️ *PONTOS ZERADOS / NÃO VISITADOS:*\n${zeradosNomes}\n\n` : '') +
      (fotosEvidencias ? `📸 *EVIDÊNCIAS DE FOTOS:*\n${fotosEvidencias}\n` : '');

    try {
      const { error } = await supabase
        .from('rondas_execucao')
        .update({
          status: statusFinal,
          data_fim: dataFim.toISOString(),
          pontos_totais: pontos.length,
          pontos_lidos: registrosRonda.length,
          resumo_detalhado: resumoTexto
        })
        .eq('id', rondaAtiva.id);

      if (error) throw error;

      // Iniciar Temporizador de 15 Minutos para a próxima ronda
      setTempoRestanteTimer(15 * 60);
      setTimerAtivo(true);

      // Link de Disparo para WhatsApp
      setWhatsAppRelatorio({
        texto: resumoTexto,
        link: `https://wa.me/?text=${encodeURIComponent(resumoTexto)}`
      });

      setRondaAtiva(null);
      setRegistrosRonda([]);
      carregarHistorico();
      setMensagem({
        tipo: 'sucesso',
        texto: 'Ronda finalizada! Temporizador de 15 minutos iniciado para a próxima varredura.'
      });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ASSUMIR POSTO COM AUTENTICAÇÃO OBRIGATÓRIA DE CONTA E SENHA
  const efetivarAssumirPosto = async (e) => {
    e.preventDefault();

    if (!operadorSelecionadoId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o operador que irá assumir o posto.' });
      return;
    }

    if (!senhaLoginEntrante.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Digite a senha de acesso para autenticar a troca de posto.' });
      return;
    }

    setLoading(true);

    try {
      // 1. Buscar e autenticar o operador na tabela Supabase
      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('id', operadorSelecionadoId)
        .eq('condominio_id', usuarioLogado.condominio_id)
        .single();

      if (opError || !opData) {
        throw new Error('Operador não encontrado no sistema.');
      }

      // Validar senha
      if (opData.senha !== senhaLoginEntrante.trim()) {
        throw new Error('Senha de acesso incorreta! Falha na autenticação do novo ronda.');
      }

      // 2. Registrar no Histórico de Passagem de Posto
      const { error: passError } = await supabase
        .from('rondas_passagem_posto')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          operador_sainte: operadorRondaAtual,
          operador_entrante: opData.nome,
          data_hora: new Date().toISOString(),
          ocorrencias_plantao: ocorrenciasPlantao.trim() || 'Sem alterações ou ocorrências graves.'
        }]);

      if (passError) throw passError;

      // 3. Atualizar o ronda ativo na aplicação
      setOperadorRondaAtual(opData.nome);
      setOperadorSelecionadoId('');
      setSenhaLoginEntrante('');
      setOcorrenciasPlantao('');
      setModalAssumirPosto(false);
      carregarPassagensPosto();

      setMensagem({
        tipo: 'sucesso',
        texto: `Autenticado com sucesso! Posto assumido pelo ronda ${opData.nome}.`
      });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
  const pontosZerados = pontos.filter(p => !pontosLidosIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Ronda Ativo: {operadorRondaAtual}
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Controle de Rondas Patrimoniais
          </h3>
          <p className="text-xs text-slate-300">
            Validação por QR Code / NFC, timer de 15 minutos e login obrigatório na troca de turno.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              carregarOperadores();
              setModalAssumirPosto(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase shadow-sm"
            title="Autenticar novo operador para assumir o posto"
          >
            <ArrowRightLeft className="w-4 h-4" /> Assumir Posto
          </button>

          <button
            onClick={() => setModalNovoPonto(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700"
          >
            <Plus className="w-4 h-4" /> Cadastrar Ponto
          </button>

          {!rondaAtiva ? (
            <button
              onClick={iniciarRonda}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase"
            >
              <Play className="w-4 h-4" /> Iniciar Ronda
            </button>
          ) : (
            <button
              onClick={finalizarRonda}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase"
            >
              <Flag className="w-4 h-4" /> Finalizar Ronda
            </button>
          )}
        </div>
      </div>

      {/* TEMPORIZADOR REGRESSIVO DE 15 MINUTOS */}
      {tempoRestanteTimer > 0 && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-xl flex items-center justify-between shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 flex-shrink-0" />
            <div>
              <strong className="block font-bold text-sm">INTERVALO DE RONDA (15 MINUTOS)</strong>
              <p className="text-xs font-medium">Aguarde a contagem para iniciar a próxima varredura no condomínio.</p>
            </div>
          </div>
          <div className="text-2xl font-black font-mono bg-slate-950 text-amber-400 px-4 py-1.5 rounded-xl">
            {formatarTempoTimer(tempoRestanteTimer)}
          </div>
        </div>
      )}

      {/* DISPARO DO RELATÓRIO VIA WHATSAPP */}
      {whatsAppRelatorio && (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="font-bold text-emerald-900 text-sm">Relatório da Ronda Gerado!</strong>
              <p className="text-xs text-emerald-700">Dispare os detalhes, horários e evidências no Grupo de Rondas.</p>
            </div>
          </div>
          <a
            href={whatsAppRelatorio.link}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition uppercase shadow-md"
          >
            <MessageCircle className="w-4 h-4" /> Enviar no Grupo <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Alertas */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* RONDA EM ANDAMENTO */}
      {rondaAtiva && (
        <div className="bg-slate-950 text-white p-5 rounded-2xl space-y-4 border border-slate-800 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Ronda Ativa</span>
              <p className="text-xs text-slate-300">
                Início: <strong>{new Date(rondaAtiva.data_inicio).toLocaleTimeString('pt-BR')}</strong> por <strong>{rondaAtiva.operador_nome}</strong>
              </p>
            </div>

            <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-3 py-1 rounded-full border border-slate-700">
              {registrosRonda.length} de {pontos.length} Pontos Validados
            </span>
          </div>

          {pontosZerados.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Ainda restam <strong>{pontosZerados.length} ponto(s) zerados</strong> nesta ronda.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pontos.map((ponto) => {
              const lido = pontosLidosIds.includes(ponto.id);
              const reg = registrosRonda.find(r => r.ponto_id === ponto.id);

              return (
                <div
                  key={ponto.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                    lido ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {ponto.codigo_tag}
                      </span>
                      {lido ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <QrCode className="w-5 h-5 text-slate-500" />
                      )}
                    </div>

                    <h4 className="font-bold text-white text-xs mt-2">{ponto.nome_ponto}</h4>
                    {ponto.localizacao_descricao && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{ponto.localizacao_descricao}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800">
                    {lido ? (
                      <span className="text-[10px] text-emerald-400 font-bold block">
                        ✓ Lido às {new Date(reg?.data_hora).toLocaleTimeString('pt-BR')}
                      </span>
                    ) : (
                      <button
                        onClick={() => abrirRegistroPonto(ponto)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg transition uppercase"
                      >
                        Validar Ponto
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTÓRICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HISTÓRICO DE RONDAS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Clock className="w-4 h-4 text-emerald-600" /> Histórico de Rondas (Início e Fim)
          </h4>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {historicoRondas.map((r) => (
              <div key={r.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <strong className="text-slate-900 block font-bold text-xs">{r.operador_nome}</strong>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Início: <strong>{new Date(r.data_inicio).toLocaleString('pt-BR')}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Fim: <strong>{r.data_fim ? new Date(r.data_fim).toLocaleString('pt-BR') : 'Não registrado'}</strong>
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    r.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {r.status} ({r.pontos_lidos || 0}/{r.pontos_totais || 0})
                  </span>
                </div>

                {r.resumo_detalhado && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(r.resumo_detalhado)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Reenviar no WhatsApp
                  </a>
                )}
              </div>
            ))}

            {historicoRondas.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">Nenhuma ronda encerrada no histórico.</p>
            )}
          </div>
        </div>

        {/* HISTÓRICO DE TROCA DE POSTO COM AUDITORIA */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <History className="w-4 h-4 text-emerald-600" /> Passagem de Posto Auditada
          </h4>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {historicoPassagens.map((p) => (
              <div key={p.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">
                    Sainte: <strong className="text-red-700">{p.operador_sainte}</strong> ➔ Entrante: <strong className="text-emerald-700">{p.operador_entrante}</strong>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(p.data_hora).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="p-2 bg-white border rounded-lg text-[11px] text-slate-700">
                  <strong>Ocorrências / Observações do Plantão:</strong>
                  <p className="mt-0.5 text-slate-600">{p.ocorrencias_plantao}</p>
                </div>
              </div>
            ))}

            {historicoPassagens.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">Nenhuma troca de posto registrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL ASSUMIR POSTO - AUTENTICAÇÃO COM LOGIN E SENHA */}
      {modalAssumirPosto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalAssumirPosto(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" /> Autenticar e Assumir Posto
            </h3>

            <form onSubmit={efetivarAssumirPosto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Operador Sainte (Saindo)</label>
                <input
                  type="text"
                  disabled
                  value={operadorRondaAtual}
                  className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Selecionar Novo Ronda (Entrante) *</label>
                <div className="relative">
                  <select
                    required
                    value={operadorSelecionadoId}
                    onChange={(e) => setOperadorSelecionadoId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 appearance-none pl-9"
                  >
                    <option value="">-- Selecione seu Nome --</option>
                    {listaOperadores.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nome} ({op.login})
                      </option>
                    ))}
                  </select>
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha do Operador *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={senhaLoginEntrante}
                    onChange={(e) => setSenhaLoginEntrante(e.target.value)}
                    placeholder="Digite sua senha de acesso"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium pl-9"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ocorrências e Alterações do Plantão *</label>
                <textarea
                  rows="3"
                  required
                  value={ocorrenciasPlantao}
                  onChange={(e) => setOcorrenciasPlantao(e.target.value)}
                  placeholder="Relate falhas no patrimônio, lâmpadas queimadas ou avisos importantes..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" /> Autenticar e Assumir Posto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR PONTO */}
      {modalNovoPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalNovoPonto(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" /> Cadastrar Ponto de Ronda
            </h3>

            <form onSubmit={cadastrarPonto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Local *</label>
                <input
                  type="text"
                  required
                  value={nomePonto}
                  onChange={(e) => setNomePonto(e.target.value)}
                  placeholder="Ex: Bloco A - Portão dos Fundos"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código QR Code / Tag NFC *</label>
                <input
                  type="text"
                  required
                  value={codigoTag}
                  onChange={(e) => setCodigoTag(e.target.value)}
                  placeholder="Ex: TAG-BLA-01"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição / Instruções</label>
                <input
                  type="text"
                  value={descricaoPonto}
                  onChange={(e) => setDescricaoPonto(e.target.value)}
                  placeholder="Ex: Checar cadeado e iluminação"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Cadastrar Ponto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LEITURA DO PONTO */}
      {modalRegistrarPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalRegistrarPonto(null)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" /> Validar: {modalRegistrarPonto.nome_ponto}
            </h3>

            <form onSubmit={confirmarLeituraPonto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código do Ponto *</label>
                <input
                  type="text"
                  required
                  value={codigoLido}
                  onChange={(e) => setCodigoLido(e.target.value)}
                  placeholder={`Digite: ${modalRegistrarPonto.codigo_tag}`}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações de Ocorrência (Opcional)</label>
                <input
                  type="text"
                  value={observacaoPonto}
                  onChange={(e) => setObservacaoPonto(e.target.value)}
                  placeholder="Ex: Local limpo e trancado"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Local / Evidência (Opcional)</label>
                <label className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 text-xs transition">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {uploadingFoto ? 'Enviando foto...' : '📷 Anexar Foto do Ponto'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files[0])}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoPontoUrl && (
                  <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500">
                    <img src={fotoPontoUrl} alt="Foto Ponto" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {coords && (
                <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> GPS Capturado: Lat {coords.lat.toFixed(4)}, Lng {coords.lng.toFixed(4)}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Confirmar Leitura do Ponto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
