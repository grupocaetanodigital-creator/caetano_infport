// Pasta: src/pages/Rondas.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  User,
  Radio,
  VideoOff
} from 'lucide-react';

export default function Rondas({ usuarioLogado }) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const nivelNum = Number(usuarioLogado?.nivel);
  const perfilTexto = String(
    usuarioLogado?.perfil || 
    usuarioLogado?.tipo || 
    usuarioLogado?.role || 
    usuarioLogado?.funcao || 
    usuarioLogado?.login || 
    ''
  ).toLowerCase();

  const podeCadastrarPonto = 
    usuarioLogado?.nivel === 0 || 
    usuarioLogado?.nivel === 1 || 
    usuarioLogado?.nivel === '0' || 
    usuarioLogado?.nivel === '1' ||
    (!isNaN(nivelNum) && nivelNum <= 1) ||
    perfilTexto.includes('admin') ||
    perfilTexto.includes('adm') ||
    perfilTexto.includes('master') ||
    perfilTexto.includes('dev') ||
    perfilTexto.includes('sindico') ||
    usuarioLogado?.nivel === undefined || 
    usuarioLogado?.nivel === null;

  const [operadorRondaAtual, setOperadorRondaAtual] = useState(
    usuarioLogado?.nome || usuarioLogado?.login || 'Vigia / Portaria'
  );

  const [listaOperadores, setListaOperadores] = useState([]);
  const [pontos, setPontos] = useState([]);
  const [rondaAtiva, setRondaAtiva] = useState(null);
  const [registrosRonda, setRegistrosRonda] = useState([]);
  const [historicoRondas, setHistoricoRondas] = useState([]);
  const [historicoPassagens, setHistoricoPassagens] = useState([]);

  // Modais
  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [modalRegistrarPonto, setModalRegistrarPonto] = useState(null);
  const [modalAssumirPosto, setModalAssumirPosto] = useState(false);
  const [whatsAppRelatorio, setWhatsAppRelatorio] = useState(null);

  // Form Novo Ponto
  const [nomePonto, setNomePonto] = useState('');
  const [codigoTag, setCodigoTag] = useState('');
  const [descricaoPonto, setDescricaoPonto] = useState('');
  const [coordsNovoPonto, setCoordsNovoPonto] = useState(null);

  // Form Leitura de Ponto
  const [codigoLido, setCodigoLido] = useState('');
  const [observacaoPonto, setObservacaoPonto] = useState('');
  const [fotoPontoUrl, setFotoPontoUrl] = useState('');
  const [coords, setCoords] = useState(null);
  const [temProblema, setTemProblema] = useState(false);

  // Scanner Câmera
  const [lendoQrCamera, setLendoQrCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Form Assumir Posto
  const [operadorSelecionadoId, setOperadorSelecionadoId] = useState('');
  const [senhaLoginEntrante, setSenhaLoginEntrante] = useState('');
  const [ocorrenciasPlantao, setOcorrenciasPlantao] = useState('');

  useEffect(() => {
    carregarPontos();
    verificarRondaAtiva();
    carregarHistorico();
    carregarPassagensPosto();
    carregarOperadores();

    return () => {
      pararCameraQr();
    };
  }, []);

  const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371000;
    const rad = (graus) => (graus * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
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
        localStorage.setItem('infport_ronda_ativa', 'true');
        if (data.operador_nome) setOperadorRondaAtual(data.operador_nome);
        carregarRegistrosRonda(data.id);
      } else {
        localStorage.setItem('infport_ronda_ativa', 'false');
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
        () => setMensagem({ tipo: 'erro', texto: 'Não foi possível capturar a geolocalização GPS do aparelho.' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const capturarGPSNovoPonto = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordsNovoPonto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setMensagem({ tipo: 'sucesso', texto: 'Coordenadas GPS capturadas para o novo ponto!' });
        },
        (err) => setMensagem({ tipo: 'erro', texto: 'Erro ao capturar GPS: ' + err.message }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setMensagem({ tipo: 'erro', texto: 'Dispositivo sem suporte para GPS.' });
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
      setMensagem({ tipo: 'sucesso', texto: 'Foto de evidência anexada!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const iniciarCameraQr = async () => {
    setLendoQrCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const scanInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const tagDetectada = barcodes[0].rawValue;
                setCodigoLido(tagDetectada.toUpperCase());
                pararCameraQr();
                clearInterval(scanInterval);
                setMensagem({ tipo: 'sucesso', texto: 'QR Code lido com sucesso!' });
              }
            } catch (err) {
              console.error('Erro na detecção do QR:', err);
            }
          }
        }, 400);
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível acessar a câmera do dispositivo: ' + err.message });
      setLendoQrCamera(false);
    }
  };

  const pararCameraQr = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLendoQrCamera(false);
  };

  const validarSemCameraFallback = () => {
    if (modalRegistrarPonto?.codigo_tag) {
      setCodigoLido(modalRegistrarPonto.codigo_tag.toUpperCase());
      setMensagem({ tipo: 'sucesso', texto: 'Código do ponto autoconfirmado.' });
    }
  };

  const abrirRegistroPonto = (ponto) => {
    setModalRegistrarPonto(ponto);
    setCodigoLido('');
    setObservacaoPonto('');
    setFotoPontoUrl('');
    setTemProblema(false);
    setLendoQrCamera(false);
    capturarGPS();
  };

  const fecharModalRegistroPonto = () => {
    pararCameraQr();
    setModalRegistrarPonto(null);
  };

  const alternarProblema = () => {
    const novoStatus = !temProblema;
    setTemProblema(novoStatus);
    if (novoStatus && !observacaoPonto.startsWith('[PROBLEMA / AVARIA]')) {
      setObservacaoPonto('[PROBLEMA / AVARIA]: ' + observacaoPonto);
    } else if (!novoStatus && observacaoPonto.startsWith('[PROBLEMA / AVARIA]: ')) {
      setObservacaoPonto(observacaoPonto.replace('[PROBLEMA / AVARIA]: ', ''));
    }
  };

  const cadastrarPonto = async (e) => {
    e.preventDefault();

    if (!podeCadastrarPonto) {
      setMensagem({ tipo: 'erro', texto: 'Apenas Administrador (ADM) ou Master podem cadastrar pontos.' });
      return;
    }

    if (!nomePonto.trim() || !codigoTag.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome do ponto e a Tag/QR Code.' });
      return;
    }

    if (!coordsNovoPonto?.lat || !coordsNovoPonto?.lng) {
      setMensagem({ tipo: 'erro', texto: 'Capture o GPS do ponto no local antes de salvar.' });
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
          localizacao_descricao: descricaoPonto.trim(),
          latitude: coordsNovoPonto.lat,
          longitude: coordsNovoPonto.lng
        }]);

      if (error) throw error;

      setNomePonto('');
      setCodigoTag('');
      setDescricaoPonto('');
      setCoordsNovoPonto(null);
      setModalNovoPonto(false);
      carregarPontos();
      setMensagem({ tipo: 'sucesso', texto: 'Ponto cadastrado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const iniciarRonda = async () => {
    if (pontos.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Cadastre ao menos um ponto antes de iniciar.' });
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

      // Atualiza o estado global de ronda iniciada
      localStorage.setItem('infport_ronda_ativa', 'true');
      localStorage.removeItem('infport_ultima_ronda_fim');
      window.dispatchEvent(new Event('ronda_iniciada'));

      setMensagem({ tipo: 'sucesso', texto: 'Ronda iniciada!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarLeituraPonto = async (e) => {
    e.preventDefault();

    if (!codigoLido) {
      setMensagem({ tipo: 'erro', texto: 'Acione a câmera e leia o QR Code do ponto para validar.' });
      return;
    }

    if (codigoLido.trim().toUpperCase() !== modalRegistrarPonto.codigo_tag.toUpperCase()) {
      setMensagem({ tipo: 'erro', texto: `QR Code lido (${codigoLido}) não corresponde a este ponto (${modalRegistrarPonto.codigo_tag})!` });
      return;
    }

    if (!coords?.lat || !coords?.lng) {
      setMensagem({ tipo: 'erro', texto: 'GPS não identificado. Ative a localização no seu celular.' });
      return;
    }

    if (modalRegistrarPonto.latitude && modalRegistrarPonto.longitude) {
      const distanciaMetros = calcularDistanciaMetros(
        coords.lat,
        coords.lng,
        modalRegistrarPonto.latitude,
        modalRegistrarPonto.longitude
      );

      const DISTANCIA_MAXIMA = 50;

      if (distanciaMetros !== null && distanciaMetros > DISTANCIA_MAXIMA) {
        setMensagem({
          tipo: 'erro',
          texto: `Local divergente! Você está a ${distanciaMetros}m do ponto (Máximo permitido: ${DISTANCIA_MAXIMA}m).`
        });
        return;
      }
    }

    if (temProblema && !fotoPontoUrl) {
      setMensagem({ tipo: 'erro', texto: 'Ao relatar um problema/avaria, anexe uma foto como evidência.' });
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
          latitude: coords.lat,
          longitude: coords.lng,
          foto_evidencia_url: fotoPontoUrl.trim() || '',
          observacao: observacaoPonto.trim() || (temProblema ? '[PROBLEMA REGISTRADO]' : 'Ponto verificado em ordem.')
        }]);

      if (error) throw error;

      fecharModalRegistroPonto();
      carregarRegistrosRonda(rondaAtiva.id);
      setMensagem({ tipo: 'sucesso', texto: `Ponto "${modalRegistrarPonto.nome_ponto}" validado com sucesso!` });
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

    const lidosNomes = registrosRonda.map(r => `• ${r.rondas_pontos?.nome_ponto || 'Ponto'} (${new Date(r.data_hora).toLocaleTimeString('pt-BR')}) ${r.observacao ? `- ${r.observacao}` : ''}`).join('\n');
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

      // Grava o horário de término para acionar o alerta global após 15min
      localStorage.setItem('infport_ultima_ronda_fim', dataFim.toISOString());
      localStorage.setItem('infport_ronda_ativa', 'false');
      window.dispatchEvent(new Event('ronda_finalizada'));

      setWhatsAppRelatorio({
        texto: resumoTexto,
        link: `https://wa.me/?text=${encodeURIComponent(resumoTexto)}`
      });

      setRondaAtiva(null);
      setRegistrosRonda([]);
      carregarHistorico();
      setMensagem({
        tipo: 'sucesso',
        texto: 'Ronda finalizada! Intervalo de 15 minutos iniciado em todo o aplicativo.'
      });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarAssumirPosto = async (e) => {
    e.preventDefault();

    if (!operadorSelecionadoId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o operador.' });
      return;
    }

    if (!senhaLoginEntrante.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Digite a senha.' });
      return;
    }

    setLoading(true);

    try {
      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('id', operadorSelecionadoId)
        .eq('condominio_id', usuarioLogado.condominio_id)
        .single();

      if (opError || !opData) throw new Error('Operador não encontrado.');
      if (opData.senha !== senhaLoginEntrante.trim()) throw new Error('Senha incorreta!');

      const { error: passError } = await supabase
        .from('rondas_passagem_posto')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          operador_sainte: operadorRondaAtual,
          operador_entrante: opData.nome,
          data_hora: new Date().toISOString(),
          ocorrencias_plantao: ocorrenciasPlantao.trim() || 'Sem alterações.'
        }]);

      if (passError) throw passError;

      setOperadorRondaAtual(opData.nome);
      setOperadorSelecionadoId('');
      setSenhaLoginEntrante('');
      setOcorrenciasPlantao('');
      setModalAssumirPosto(false);
      carregarPassagensPosto();

      setMensagem({ tipo: 'sucesso', texto: `Posto assumido por ${opData.nome}.` });
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
            Validação por Câmera QR Code com GPS e temporizador global de 15 minutos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              carregarOperadores();
              setModalAssumirPosto(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" /> Assumir Posto
          </button>

          {podeCadastrarPonto && (
            <button
              onClick={() => {
                setCoordsNovoPonto(null);
                setModalNovoPonto(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Cadastrar Ponto
            </button>
          )}

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

      {/* RELATÓRIO VIA WHATSAPP */}
      {whatsAppRelatorio && (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="font-bold text-emerald-900 text-sm">Relatório de Ronda Gerado!</strong>
              <p className="text-xs text-emerald-700">Dispare os detalhes e evidências no grupo do condomínio.</p>
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
              <span>Ainda restam <strong>{pontosZerados.length} ponto(s) zerados</strong>.</span>
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
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition uppercase flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Validar Ponto
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE VALIDAÇÃO DO PONTO POR CÂMERA */}
      {modalRegistrarPonto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" /> Validar: {modalRegistrarPonto.nome_ponto}
              </h3>
              <button onClick={fecharModalRegistroPonto} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900 text-white p-3.5 rounded-xl text-center space-y-3">
                <span className="text-[11px] text-slate-300 font-medium block">
                  CÓDIGO ESPERADO: <strong className="text-emerald-400 font-mono">{modalRegistrarPonto.codigo_tag}</strong>
                </span>

                {lendoQrCamera ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500">
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-2 border-dashed border-emerald-400 opacity-60 pointer-events-none m-6 rounded-lg"></div>
                    </div>
                    <button
                      type="button"
                      onClick={pararCameraQr}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <VideoOff className="w-4 h-4" /> Cancelar Câmera
                    </button>
                  </div>
                ) : codigoLido ? (
                  <div className="bg-emerald-950/80 border border-emerald-500/50 p-2.5 rounded-lg flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>QR Code Lido: <strong className="font-mono text-white">{codigoLido}</strong></span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={iniciarCameraQr}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition uppercase shadow-md"
                    >
                      <Camera className="w-4 h-4" /> Activar Câmera para Ler QR Code
                    </button>

                    <button
                      type="button"
                      onClick={validarSemCameraFallback}
                      className="text-[11px] text-slate-400 hover:text-slate-200 underline block mx-auto"
                    >
                      Autoconfirmar Código Tag (Leitura Direta)
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={alternarProblema}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                  temProblema
                    ? 'bg-red-600 text-white border-red-700 shadow-sm'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                {temProblema ? '⚠️ PROBLEMA NOTIFICADO (CLIQUE PARA REMOVER)' : 'RELATAR ANOMALIA / PROBLEMA NESTE PONTO'}
              </button>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  OBSERVAÇÕES DO RONDA {temProblema && <span className="text-red-600">*</span>}
                </label>
                <textarea
                  rows="2"
                  value={observacaoPonto}
                  onChange={(e) => setObservacaoPonto(e.target.value)}
                  placeholder={temProblema ? 'Descreva o problema encontrado no local...' : 'Ex: Lâmpada queimada ou tudo em ordem'}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  FOTO DA EVIDÊNCIA {temProblema ? '(OBRIGATÓRIA PARA PROBLEMA)' : '(OPCIONAL)'}
                </label>
                {fotoPontoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={fotoPontoUrl} alt="Evidência" className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoPontoUrl('')}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl cursor-pointer border border-dashed border-slate-300 transition">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>{uploadingFoto ? 'Enviando...' : 'Tirar Foto / Anexar Evidência'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => uploadFoto(e.target.files[0])}
                      disabled={uploadingFoto}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={fecharModalRegistroPonto}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarLeituraPonto}
                disabled={loading || !codigoLido}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition uppercase shadow-sm disabled:opacity-50"
              >
                Confirmar Leitura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR NOVO PONTO */}
      {modalNovoPonto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Novo Ponto de Ronda
              </h3>
              <button onClick={() => setModalNovoPonto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={cadastrarPonto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NOME DO PONTO *</label>
                <input
                  type="text"
                  value={nomePonto}
                  onChange={(e) => setNomePonto(e.target.value)}
                  placeholder="Ex: Ponto 01 - Portão dos Fundos"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CÓDIGO DA TAG / QR CODE *</label>
                <input
                  type="text"
                  value={codigoTag}
                  onChange={(e) => setCodigoTag(e.target.value.toUpperCase())}
                  placeholder="Ex: TAG-FUNDOS-01"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">DESCRIÇÃO DA LOCALIZAÇÃO</label>
                <input
                  type="text"
                  value={descricaoPonto}
                  onChange={(e) => setDescricaoPonto(e.target.value)}
                  placeholder="Ex: Ao lado da lixeira da Torre A"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center space-y-2">
                <label className="block text-xs font-bold text-slate-700">COORDENADAS GPS DO PONTO</label>
                {coordsNovoPonto ? (
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded block border border-emerald-200">
                    Lat: {coordsNovoPonto.lat.toFixed(6)} | Lng: {coordsNovoPonto.lng.toFixed(6)}
                  </span>
                ) : (
                  <p className="text-[11px] text-slate-500">Capture o GPS estando presente no local exato do ponto.</p>
                )}
                <button
                  type="button"
                  onClick={capturarGPSNovoPonto}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 w-full transition uppercase shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" /> Capturar GPS do Local
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalNovoPonto(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition uppercase shadow-sm"
                >
                  Salvar Ponto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASSUMIR POSTO */}
      {modalAssumirPosto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Troca de Posto de Ronda
              </h3>
              <button onClick={() => setModalAssumirPosto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={efetivarAssumirPosto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">OPERADOR ENTRANTE *</label>
                <select
                  value={operadorSelecionadoId}
                  onChange={(e) => setOperadorSelecionadoId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Selecione o operador...</option>
                  {listaOperadores.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.nome} ({op.funcao || 'Operador'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SENHA DE ACESSO DO ENTRANTE *</label>
                <input
                  type="password"
                  value={senhaLoginEntrante}
                  onChange={(e) => setSenhaLoginEntrante(e.target.value)}
                  placeholder="Digite sua senha..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">OBSERVAÇÕES DA TROCA</label>
                <textarea
                  rows="2"
                  value={ocorrenciasPlantao}
                  onChange={(e) => setOcorrenciasPlantao(e.target.value)}
                  placeholder="Ex: Posto assumido sem novidades."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalAssumirPosto(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition uppercase shadow-sm"
                >
                  Assumir Posto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTÓRICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200">
                  "{p.ocorrencias_plantao}"
                </p>
              </div>
            ))}

            {historicoPassagens.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">Nenhuma troca de posto auditada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
