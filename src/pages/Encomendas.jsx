import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Plus, 
  UserCheck, 
  MessageCircle, 
  ExternalLink, 
  X, 
  Camera, 
  QrCode, 
  Clock, 
  Building2, 
  Layers, 
  CheckSquare, 
  Square,
  ArrowLeft,
  User
} from 'lucide-react';

export default function Encomendas({ usuarioLogado }) {
  const [etapa, setEtapa] = useState('1'); // '1' = Recebimento Lote RE, '2' = Triagem, '3' = Baixa/Saída
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Listas do Banco
  const [entregadores, setEntregadores] = useState([]);
  const [lotesPendentes, setLotesPendentes] = useState([]);
  const [moradores, setMoradores] = useState([]);
  const [todosItensRetidos, setTodosItensRetidos] = useState([]);

  // Métricas / Displays do Dia (00:00 às 23:59)
  const [statsDia, setStatsDia] = useState({
    lotesHoje: 0,
    triadasHoje: 0,
    aguardandoTriagem: 0,
    retidosPorBloco: {}
  });

  // Estados 1ª ETAPA: Recebimento de Lote RE
  const [buscaEntregador, setBuscaEntregador] = useState('');
  const [entregadorSelecionado, setEntregadorSelecionado] = useState(null);
  const [qtdDeclarada, setQtdDeclarada] = useState(1);
  const [modalNovoEntregador, setModalNovoEntregador] = useState(false);
  const [novoEntNome, setNovoEntNome] = useState('');
  const [novoEntDoc, setNovoEntDoc] = useState('');
  const [novoEntEmpresa, setNovoEntEmpresa] = useState('');
  const [loteCriadoWhats, setLoteCriadoWhats] = useState(null);

  // Estados 2ª ETAPA: Triagem Individual
  const [loteAtivo, setLoteAtivo] = useState(null);
  const [unidadeTriagem, setUnidadeTriagem] = useState('');
  const [blocoTriagem, setBlocoTriagem] = useState('');
  const [moradoresDaUnidade, setMoradoresDaUnidade] = useState([]);
  const [moradorSelecionado, setMoradorSelecionado] = useState(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [fotoEtiquetaUrl, setFotoEtiquetaUrl] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [alertaAgrupamento, setAlertaAgrupamento] = useState(null);
  const [itemTriadoWhats, setItemTriadoWhats] = useState(null);

  // Estados do Leitor de Código de Barras / QR Code
  const [modalLeitor, setModalLeitor] = useState(false);
  const [destinoLeitor, setDestinoLeitor] = useState('triagem'); // 'triagem' ou 'baixa'
  const [erroCamera, setErroCamera] = useState('');
  const videoRef = useRef(null);

  // Estados 3ª ETAPA: Saída / Baixa
  const [buscaBaixaGeral, setBuscaBaixaGeral] = useState('');
  const [abaBlocoSelecionada, setAbaBlocoSelecionada] = useState('TODOS');
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState([]);
  const [nomeRetirante, setNomeRetirante] = useState('');
  const [fotoRetiranteUrl, setFotoRetiranteUrl] = useState('');
  const [baixaConcluidaWhats, setBaixaConcluidaWhats] = useState(null);

  // Extrai a lista de blocos únicos cadastrados no condomínio
  const blocosDisponiveis = Array.from(
    new Set(moradores.map(m => m.bloco).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  useEffect(() => {
    carregarDadosBase();
  }, [etapa]);

  const carregarDadosBase = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);
    try {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date();
      fimDia.setHours(23, 59, 59, 999);

      // 1. Carregar Entregadores
      const { data: entData } = await supabase
        .from('entregadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setEntregadores(entData || []);

      // 2. Carregar Lotes Pendentes
      const { data: lotesData } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa, documento)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });
      setLotesPendentes(lotesData || []);

      // 3. Carregar Moradores
      const { data: moradData } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setMoradores(moradData || []);

      // 4. Carregar Todos os Itens RETIDOS na Portaria
      const { data: retidosData } = await supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'retido')
        .order('created_at', { ascending: false });
      setTodosItensRetidos(retidosData || []);

      // 5. Métricas do Dia
      const { data: lotesHojeData } = await supabase
        .from('lotes_re')
        .select('id, qtd_declarada, qtd_triada')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      const { data: triadosHojeData } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      const totalLotesHoje = lotesHojeData?.length || 0;
      const totalTriadasHoje = triadosHojeData?.length || 0;
      const totalAguardando = (lotesData || []).reduce((acc, l) => acc + (l.qtd_declarada - l.qtd_triada), 0);

      const mapaBlocos = {};
      (retidosData || []).forEach(item => {
        const blk = item.bloco ? `Bloco ${item.bloco}` : 'Geral / Sem Bloco';
        mapaBlocos[blk] = (mapaBlocos[blk] || 0) + 1;
      });

      setStatsDia({
        lotesHoje: totalLotesHoje,
        triadasHoje: totalTriadasHoje,
        aguardandoTriagem: totalAguardando,
        retidosPorBloco: mapaBlocos
      });

    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const tocarAlertaSonoro = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.log('Audio API indisponível', e);
    }
  };

  const tocarBipSucesso = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio API indisponível', e);
    }
  };

  const uploadFotoStorage = async (file, pastaDestino, setUrlCallback) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${pastaDestino}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('encomendas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encomendas')
        .getPublicUrl(fileName);

      setUrlCallback(urlData.publicUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto capturada e salva com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const abrirLeitorCamera = async (destino = 'triagem') => {
    setDestinoLeitor(destino);
    setModalLeitor(true);
    setErroCamera('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setErroCamera('Não foi possível acessar a câmera: ' + err.message);
    }
  };

  const fecharLeitorCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setModalLeitor(false);
  };

  useEffect(() => {
    let intervalId = null;
    if (modalLeitor) {
      intervalId = setInterval(async () => {
        if ('BarcodeDetector' in window && videoRef.current && videoRef.current.readyState === 4) {
          try {
            const barcodeDetector = new window.BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf']
            });
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const valorLido = barcodes[0].rawValue;
              tocarBipSucesso();
              fecharLeitorCamera();

              if (destinoLeitor === 'triagem') {
                setCodigoBarras(valorLido);
                setMensagem({ tipo: 'sucesso', texto: `Código de rastreio lido: ${valorLido}` });
              } else {
                setBuscaBaixaGeral(valorLido);
                setMensagem({ tipo: 'sucesso', texto: `Código buscado na saída: ${valorLido}` });
              }
            }
          } catch (e) {
            console.error('Erro ao ler código:', e);
          }
        }
      }, 400);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [modalLeitor, destinoLeitor]);

  // 1ª ETAPA: RECEBIMENTO DO LOTE RE
  const entregadoresFiltrados = entregadores.filter(ent => {
    const termo = buscaEntregador.toLowerCase();
    const nome = ent.nome?.toLowerCase() || '';
    const empresa = ent.empresa?.toLowerCase() || '';
    const doc = ent.documento?.toLowerCase() || '';
    return nome.includes(termo) || empresa.includes(termo) || doc.includes(termo);
  });

  const cadastrarEntregadorRapido = async (e) => {
    e.preventDefault();
    if (!novoEntNome.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entregadores')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          nome: novoEntNome.trim(),
          documento: novoEntDoc.trim(),
          empresa: novoEntEmpresa.trim()
        }])
        .select()
        .single();

      if (error) throw error;
      setEntregadores([...entregadores, data]);
      setEntregadorSelecionado(data);
      setModalNovoEntregador(false);
      setNovoEntNome(''); setNovoEntDoc(''); setNovoEntEmpresa('');
      setMensagem({ tipo: 'sucesso', texto: 'Entregador cadastrado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const criarLoteRE = async (e) => {
    e.preventDefault();
    if (!entregadorSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um entregador da lista.' });
      return;
    }
    setLoading(true);

    try {
      const hoje = new Date();
      const dataStr = `${String(hoje.getDate()).padStart(2, '0')}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getFullYear()).slice(-2)}`;
      const operSigla = usuarioLogado?.login?.toUpperCase() || 'OPER001';
      const seq = Math.floor(100 + Math.random() * 900);
      const codigoRE = `RE:${dataStr}${operSigla}${seq}`;

      const { data, error } = await supabase
        .from('lotes_re')
        .insert([{
          codigo_re: codigoRE,
          condominio_id: usuarioLogado.condominio_id,
          entregador_id: entregadorSelecionado.id,
          qtd_declarada: parseInt(qtdDeclarada),
          qtd_triada: 0,
          status: 'aguardando_triagem',
          operador_id: usuarioLogado?.login || usuarioLogado?.id || 'Operador'
        }])
        .select('*, entregadores(nome, empresa, documento)')
        .single();

      if (error) throw error;

      const textoWhats = `📦 *NOVO LOTE DE ENCOMENDAS RECEBIDO (RE)*\nLote: ${data.codigo_re}\nTransportadora: ${data.entregadores?.empresa || 'N/A'}\nEntregador: ${data.entregadores?.nome} (Doc: ${data.entregadores?.documento || 'N/A'})\nTotal de Volumes Declarados: ${data.qtd_declarada} pacotes\nOperador: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setLoteCriadoWhats({ codigo: data.codigo_re, link: `https://wa.me/?text=${encodeURIComponent(textoWhats)}` });
      setEntregadorSelecionado(null);
      setBuscaEntregador('');
      setQtdDeclarada(1);
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: `Lote ${codigoRE} gerado com sucesso!` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 2ª ETAPA: TRIAGEM INDIVIDUAL
  const buscarMoradoresEChecarAgrupamento = async (unid, bloc) => {
    setUnidadeTriagem(unid);
    setBlocoTriagem(bloc);

    if (!unid.trim()) {
      setMoradoresDaUnidade([]);
      setMoradorSelecionado(null);
      setAlertaAgrupamento(null);
      return;
    }

    const moradoresEncontrados = moradores.filter(m => {
      const uMatch = m.unidade?.toString().toLowerCase() === unid.trim().toLowerCase();
      const bMatch = bloc.trim() ? m.bloco?.toString().toLowerCase() === bloc.trim().toLowerCase() : true;
      return uMatch && bMatch;
    });
    setMoradoresDaUnidade(moradoresEncontrados);

    if (moradoresEncontrados.length > 0) {
      setMoradorSelecionado(moradoresEncontrados[0]);
    } else {
      setMoradorSelecionado(null);
    }

    let query = supabase
      .from('encomendas_itens')
      .select('*')
      .eq('condominio_id', usuarioLogado.condominio_id)
      .eq('unidade', unid.trim())
      .eq('status', 'retido');

    if (bloc.trim()) {
      query = query.eq('bloco', bloc.trim());
    }

    const { data: itensRetidos } = await query;

    if (itensRetidos && itensRetidos.length > 0) {
      tocarAlertaSonoro();
      setAlertaAgrupamento({
        qtd: itensRetidos.length,
        unidade: unid,
        bloco: bloc
      });
    } else {
      setAlertaAgrupamento(null);
    }
  };

  const salvarItemTriagem = async (e) => {
    e.preventDefault();
    if (!loteAtivo || !unidadeTriagem.trim() || !fotoEtiquetaUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha a unidade e tire a foto da encomenda.' });
      return;
    }
    setLoading(true);

    try {
      const { error: itemErr } = await supabase
        .from('encomendas_itens')
        .insert([{
          lote_re_id: loteAtivo.id,
          condominio_id: usuarioLogado.condominio_id,
          bloco: blocoTriagem.trim(),
          unidade: unidadeTriagem.trim(),
          morador_id: moradorSelecionado?.id || null,
          codigo_barras: codigoBarras.trim(),
          foto_etiqueta_url: fotoEtiquetaUrl.trim(),
          observacoes: observacoes.trim(),
          status: 'retido'
        }]);

      if (itemErr) throw itemErr;

      const novaQtdTriada = (loteAtivo.qtd_triada || 0) + 1;
      const novoStatusLote = novaQtdTriada >= loteAtivo.qtd_declarada ? 'concluido' : 'em_triagem';

      await supabase
        .from('lotes_re')
        .update({ qtd_triada: novaQtdTriada, status: novoStatusLote })
        .eq('id', loteAtivo.id);

      setLoteAtivo(prev => prev ? ({ ...prev, qtd_triada: novaQtdTriada, status: novoStatusLote }) : null);

      const telMorador = moradorSelecionado?.telefone?.replace(/\D/g, '') || '';
      const nomeDestinatario = moradorSelecionado ? moradorSelecionado.nome : 'Morador';

      const textoWhatsMorador = `Olá, ${nomeDestinatario} (Apt ${unidadeTriagem}${blocoTriagem ? ' - Bloco ' + blocoTriagem : ''})! 📦\n\nSua encomenda acabou de chegar na Portaria.\n• Destinatário: ${nomeDestinatario}\n• Código/Lote: ${loteAtivo.codigo_re}\n• Cód. Rastreio: ${codigoBarras || 'N/A'}\n• Observação: ${observacoes || 'Nenhuma'}\n• Foto do Pacote: ${fotoEtiquetaUrl}\n\nPor favor, retire na portaria assim que possível!`;

      setItemTriadoWhats({
        destinatario: nomeDestinatario,
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoWhatsMorador)}` : `https://wa.me/?text=${encodeURIComponent(textoWhatsMorador)}`
      });

      setUnidadeTriagem(''); setBlocoTriagem(''); setMoradorSelecionado(null); setMoradoresDaUnidade([]);
      setCodigoBarras(''); setFotoEtiquetaUrl(''); setObservacoes('');
      setAlertaAgrupamento(null);
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: 'Pacote triado e registrado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 3ª ETAPA: SAÍDA / BAIXA COM FILTROS AVANÇADOS
  const itensRetidosFiltrados = todosItensRetidos.filter(item => {
    if (abaBlocoSelecionada !== 'TODOS') {
      const blocoItem = item.bloco ? `Bloco ${item.bloco}` : 'Geral / Sem Bloco';
      if (blocoItem !== abaBlocoSelecionada) return false;
    }

    if (!buscaBaixaGeral.trim()) return true;

    const termo = buscaBaixaGeral.toLowerCase().trim();
    const termoSemEspaco = termo.replace(/\s+/g, '');

    const unid = item.unidade?.toString().toLowerCase() || '';
    const bloc = item.bloco?.toString().toLowerCase() || '';
    const cod = item.codigo_barras?.toString().toLowerCase() || '';
    const moradorNome = item.moradores?.nome?.toLowerCase() || '';

    const comboUnidBloco = `${unid}${bloc}`;
    const comboUnidBlocoEspaco = `${unid} ${bloc}`;
    const comboBlocoUnid = `${bloc}${unid}`;

    return (
      unid.includes(termo) ||
      bloc.includes(termo) ||
      cod.includes(termo) ||
      moradorNome.includes(termo) ||
      comboUnidBloco.includes(termoSemEspaco) ||
      comboUnidBlocoEspaco.includes(termo) ||
      comboBlocoUnid.includes(termoSemEspaco)
    );
  });

  // Lista de moradores das unidades selecionadas na Etapa 3 (Baixa)
  const itensSelecionadosObjetos = todosItensRetidos.filter(i => itensSelecionadosIds.includes(i.id));
  const moradoresDasUnidadesBaixa = moradores.filter(m => 
    itensSelecionadosObjetos.some(item => 
      String(item.unidade).toLowerCase() === String(m.unidade).toLowerCase() &&
      (!item.bloco || String(item.bloco).toLowerCase() === String(m.bloco || '').toLowerCase())
    )
  );

  const toggleItemSelecao = (id) => {
    if (itensSelecionadosIds.includes(id)) {
      setItensSelecionadosIds(itensSelecionadosIds.filter(item => item !== id));
    } else {
      setItensSelecionadosIds([...itensSelecionadosIds, id]);
    }
  };

  const efetivarBaixaSaida = async (e) => {
    e.preventDefault();
    if (itensSelecionadosIds.length === 0 || !nomeRetirante.trim() || !fotoRetiranteUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Selecione os pacotes, informe o nome do retirante e tire a foto da entrega.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('encomendas_itens')
        .update({
          status: 'entregue',
          retirado_por: nomeRetirante.trim(),
          foto_retirada_url: fotoRetiranteUrl.trim(),
          data_retirada: new Date().toISOString(),
          operador_baixa_id: usuarioLogado?.login || usuarioLogado?.id || 'Operador'
        })
        .in('id', itensSelecionadosIds);

      if (error) throw error;

      const primeiroItem = todosItensRetidos.find(i => i.id === itensSelecionadosIds[0]);
      const telMorador = primeiroItem?.moradores?.telefone?.replace(/\D/g, '') || '';
      const textoCruzado = `✅ *CONFIRMAÇÃO DE RETIRADA DE ENCOMENDA*\nUnidade: Apt ${primeiroItem?.unidade || ''}${primeiroItem?.bloco ? ' - Bloco ' + primeiroItem.bloco : ''}\n\nInformamos que o(s) pacote(s) foram RETIRADOS da portaria:\n• Qtd de Volumes Retirados: ${itensSelecionadosIds.length}\n• Quem Retirou: ${nomeRetirante}\n• Comprovante da Entrega: ${fotoRetiranteUrl}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setBaixaConcluidaWhats({
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoCruzado)}` : `https://wa.me/?text=${encodeURIComponent(textoCruzado)}`
      });

      setItensSelecionadosIds([]);
      setNomeRetirante(''); setFotoRetiranteUrl('');
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída realizada com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PAINEL DE METRICAS E CONTADORES DO DIA (00:00 ÀS 23:59) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Lotes RE Criados Hoje</span>
            <strong className="text-2xl font-black text-slate-900">{statsDia.lotesHoje}</strong>
            <span className="text-[10px] text-slate-500 block">00:00 às 23:59</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Encomendas Triadas Hoje</span>
            <strong className="text-2xl font-black text-emerald-700">{statsDia.triadasHoje}</strong>
            <span className="text-[10px] text-slate-500 block">00:00 às 23:59</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Aguardando Triagem</span>
            <strong className="text-2xl font-black text-amber-700">{statsDia.aguardandoTriagem}</strong>
            <span className="text-[10px] text-slate-500 block">Pacotes em lotes abertos</span>
          </div>
        </div>
      </div>

      {/* DISPLAY DE PACOTES RETIDOS POR BLOCO */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" /> Pacotes Retidos na Portaria por Bloco:
          </h4>
          <span className="text-xs font-mono font-bold bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-md">
            Total Retido: {todosItensRetidos.length} vol.
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {Object.keys(statsDia.retidosPorBloco).length > 0 ? (
            Object.entries(statsDia.retidosPorBloco).map(([blocoNome, qtd]) => (
              <div 
                key={blocoNome} 
                onClick={() => { setEtapa('3'); setAbaBlocoSelecionada(blocoNome); }}
                className="bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs transition"
              >
                <span className="font-bold text-slate-200">{blocoNome}:</span>
                <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-xs">
                  {qtd} {qtd === 1 ? 'pacote' : 'pacotes'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhuma encomenda retida no momento.</p>
          )}
        </div>
      </div>

      {/* Navegação Sequencial de 3 Etapas */}
      <div className="grid grid-cols-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setEtapa('1')}
          className={`p-4 text-left border-b-4 transition ${etapa === '1' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">1ª Etapa</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><Truck className="w-4 h-4" /> Recebimento (RE)</strong>
        </button>

        <button
          onClick={() => setEtapa('2')}
          className={`p-4 text-left border-b-4 transition ${etapa === '2' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">2ª Etapa</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><Package className="w-4 h-4" /> Triagem do Lote</strong>
        </button>

        <button
          onClick={() => setEtapa('3')}
          className={`p-4 text-left border-b-4 transition ${etapa === '3' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">3ª Etapa</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> Saída / Baixa</strong>
        </button>
      </div>

      {/* Mensagens Globais */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* 1ª ETAPA — RECEBIMENTO DO LOTE (RE) */}
      {etapa === '1' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Truck className="w-6 h-6 text-slate-800" /> Novo Recebimento de Entrega (RE)
            </h3>
            <button
              onClick={() => setModalNovoEntregador(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> + Cadastro Rápido de Entregador
            </button>
          </div>

          <form onSubmit={criarLoteRE} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Buscar / Selecionar Entregador *</label>
              
              {!entregadorSelecionado ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={buscaEntregador}
                      onChange={(e) => setBuscaEntregador(e.target.value)}
                      placeholder="Digite o nome, empresa ou documento do entregador..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-100">
                    {entregadoresFiltrados.length > 0 ? (
                      entregadoresFiltrados.map((ent) => (
                        <div
                          key={ent.id}
                          onClick={() => {
                            setEntregadorSelecionado(ent);
                            setBuscaEntregador('');
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{ent.nome}</p>
                            <p className="text-[11px] text-slate-500">
                              {ent.empresa ? `Empresa: ${ent.empresa}` : 'Avulso'} | Doc: {ent.documento || 'Sem doc'}
                            </p>
                          </div>
                          <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                            Selecionar
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-xs text-slate-500 italic text-center">
                        Nenhum entregador encontrado com esse termo.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">Entregador Selecionado</span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">{entregadorSelecionado.nome}</h4>
                    <p className="text-xs text-slate-500">
                      Empresa: {entregadorSelecionado.empresa || 'Avulso'} | Doc: {entregadorSelecionado.documento || 'Sem doc'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEntregadorSelecionado(null)}
                    className="text-xs text-red-600 hover:text-red-800 font-bold p-2 hover:bg-red-50 rounded-lg transition"
                  >
                    Trocar
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Quantidade de Volumes Declarados *</label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                value={qtdDeclarada}
                onChange={(e) => setQtdDeclarada(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !entregadorSelecionado}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <Truck className="w-5 h-5" /> Gerar Registro de Entregas (Lote RE)
            </button>
          </form>

          {/* ALERTA DE LOTE CRIADO - WHATSAPP */}
          {loteCriadoWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lote criado: {loteCriadoWhats.codigo}
                </span>
                <a
                  href={loteCriadoWhats.link}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2ª ETAPA — TRIAGEM INDIVIDUAL DO LOTE RE */}
      {etapa === '2' && (
        <div className="space-y-6">
          {!loteAtivo ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" /> Selecione um Lote RE Pendente para Iniciar a Triagem:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lotesPendentes.length > 0 ? (
                  lotesPendentes.map((lote) => (
                    <div
                      key={lote.id}
                      onClick={() => setLoteAtivo(lote)}
                      className="p-4 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-400 rounded-xl cursor-pointer transition flex justify-between items-center"
                    >
                      <div>
                        <strong className="text-sm font-bold text-slate-900 block">{lote.codigo_re}</strong>
                        <p className="text-xs text-slate-500 mt-1">
                          Entregador: {lote.entregadores?.nome} ({lote.entregadores?.empresa || 'Avulso'})
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Criado em: {new Date(lote.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md block">
                          {lote.qtd_triada} / {lote.qtd_declarada} vol.
                        </span>
                        <span className="text-[10px] text-amber-700 font-bold block mt-1">Clique p/ Triar</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500 italic">Nenhum lote RE pendente no momento.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex justify-between items-center bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Lote RE em Triagem</span>
                  <h3 className="text-lg font-black text-slate-900">{loteAtivo.codigo_re}</h3>
                  <p className="text-xs text-slate-600">
                    Entregador: {loteAtivo.entregadores?.nome} | Progresso: <strong>{loteAtivo.qtd_triada}</strong> de <strong>{loteAtivo.qtd_declarada}</strong> volumes
                  </p>
                </div>
                <button
                  onClick={() => setLoteAtivo(null)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg transition"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Trocar Lote
                </button>
              </div>

              {/* FORMULÁRIO DE TRIAGEM COM UNIDADE NUMÉRICA E BLOCO EM LISTA */}
              <form onSubmit={salvarItemTriagem} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BLOCO LISTADO (SELECT) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Bloco / Torre *</label>
                    <select
                      value={blocoTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    >
                      <option value="">Selecione o Bloco (Ou Geral)</option>
                      {blocosDisponiveis.map((b) => (
                        <option key={b} value={b}>Bloco {b}</option>
                      ))}
                    </select>
                  </div>

                  {/* UNIDADE COM TECLADO NUMÉRICO */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Unidade / Apt *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={unidadeTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(e.target.value, blocoTriagem)}
                      placeholder="Ex: 102"
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>
                </div>

                {/* ALERTA SONORO/VISUAL DE AGRUPAMENTO DE ENCOMENDAS */}
                {alertaAgrupamento && (
                  <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-between shadow-md animate-pulse">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> ⚠️ ATENÇÃO: Já existem {alertaAgrupamento.qtd} pacote(s) RETIDOS para a unidade {alertaAgrupamento.unidade}!
                    </span>
                  </div>
                )}

                {/* MORADORES ENCONTRADOS */}
                {moradoresDaUnidade.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Destinatário Encontrado *</label>
                    <div className="flex flex-wrap gap-2">
                      {moradoresDaUnidade.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMoradorSelecionado(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            moradorSelecionado?.id === m.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {m.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CÓDIGO DE BARRAS / RASTREIO */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Código de Rastreio / Barras</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      placeholder="Escaneie ou digite o código..."
                      className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                    <button
                      type="button"
                      onClick={() => abrirLeitorCamera('triagem')}
                      className="px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg flex items-center gap-1 text-xs transition"
                    >
                      <QrCode className="w-4 h-4" /> Ler Câmera
                    </button>
                  </div>
                </div>

                {/* FOTO DA ETIQUETA/PACOTE */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Pacote/Etiqueta *</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold px-4 py-3 rounded-lg flex items-center gap-2 transition">
                      <Camera className="w-4 h-4" />
                      {uploadingFoto ? 'Enviando...' : 'Tirar Foto / Anexar'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => uploadFotoStorage(e.target.files[0], 'etiquetas', setFotoEtiquetaUrl)}
                        className="hidden"
                      />
                    </label>

                    {fotoEtiquetaUrl && (
                      <a href={fotoEtiquetaUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-bold underline flex items-center gap-1">
                        Ver Foto Salva <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* OBSERVAÇÕES */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Observações (Opcional)</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Caixa amassada, volume grande, etc."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || uploadingFoto || !unidadeTriagem.trim() || !fotoEtiquetaUrl}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Confirmar e Registrar Pacote Triado
                </button>
              </form>

              {/* OVERLAY DE NOTIFICAÇÃO WHATSAPP */}
              {itemTriadoWhats && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    Notificação gerada para {itemTriadoWhats.destinatario}!
                  </span>
                  <a
                    href={itemTriadoWhats.link}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-4 h-4" /> Notificar Morador no WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3ª ETAPA — SAÍDA / BAIXA COM LISTA DE MORADORES */}
      {etapa === '3' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-emerald-600" /> Baixa e Saída de Encomendas Retidas
            </h3>

            {/* BUSCA RÁPIDA POR CÓDIGO OU MORADOR */}
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={buscaBaixaGeral}
                  onChange={(e) => setBuscaBaixaGeral(e.target.value)}
                  placeholder="Buscar apt, bloco, morador ou cód..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>
              <button
                type="button"
                onClick={() => abrirLeitorCamera('baixa')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition"
              >
                <QrCode className="w-4 h-4" /> Ler QR
              </button>
            </div>
          </div>

          {/* FILTRO POR ABAS DE BLOCO */}
          <div className="flex flex-wrap gap-2 border-b pb-3">
            <button
              onClick={() => setAbaBlocoSelecionada('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                abaBlocoSelecionada === 'TODOS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({todosItensRetidos.length})
            </button>
            {Object.keys(statsDia.retidosPorBloco).map((blocoNome) => (
              <button
                key={blocoNome}
                onClick={() => setAbaBlocoSelecionada(blocoNome)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  abaBlocoSelecionada === blocoNome
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {blocoNome} ({statsDia.retidosPorBloco[blocoNome]})
              </button>
            ))}
          </div>

          {/* TABELA / LISTA DE ENCOMENDAS RETIDAS PARA SELEÇÃO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>{itensRetidosFiltrados.length} pacotes encontrados</span>
              <span>{itensSelecionadosIds.length} selecionados</span>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {itensRetidosFiltrados.length > 0 ? (
                itensRetidosFiltrados.map((item) => {
                  const selecionado = itensSelecionadosIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemSelecao(item.id)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                        selecionado ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selecionado ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                        <div>
                          <strong className="text-sm text-slate-900 block">
                            Apt {item.unidade} {item.bloco ? `- Bloco ${item.bloco}` : ''}
                          </strong>
                          <span className="text-xs text-slate-600 block">
                            Destinatário: {item.moradores?.nome || 'Morador'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono block">
                            Rastreio: {item.codigo_barras || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {item.foto_etiqueta_url && (
                        <img
                          src={item.foto_etiqueta_url}
                          alt="Pacote"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Nenhuma encomenda retida encontrada.
                </div>
              )}
            </div>
          </div>

          {/* FORMULÁRIO DE EFETIVAÇÃO DA BAIXA COM SELEÇÃO DIRETA DE MORADORES */}
          {itensSelecionadosIds.length > 0 && (
            <form onSubmit={efetivarBaixaSaida} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" /> Confirmar Saída para ({itensSelecionadosIds.length}) volume(s)
              </h4>

              {/* LISTAGEM DOS MORADORES DA UNIDADE SELECIONADA PARA SELEÇÃO RÁPIDA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Moradores Cadastrados na Unidade (Clique para Selecionar) *
                </label>
                
                {moradoresDasUnidadesBaixa.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {moradoresDasUnidadesBaixa.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNomeRetirante(m.nome)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                          nomeRetirante === m.nome
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        {m.nome}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic mb-2">
                    Nenhum morador específico vinculado. Digite o nome do retirante abaixo:
                  </p>
                )}

                <input
                  type="text"
                  value={nomeRetirante}
                  onChange={(e) => setNomeRetirante(e.target.value)}
                  placeholder="Nome de quem está retirando a encomenda..."
                  required
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>

              {/* FOTO COMPROVANTE DE ENTREGA */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto Comprovante da Entrega *</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold px-4 py-3 rounded-lg flex items-center gap-2 transition">
                    <Camera className="w-4 h-4 text-slate-600" />
                    {uploadingFoto ? 'Enviando...' : 'Tirar Foto da Entrega'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => uploadFotoStorage(e.target.files[0], 'saidas', setFotoRetiranteUrl)}
                      className="hidden"
                    />
                  </label>

                  {fotoRetiranteUrl && (
                    <a href={fotoRetiranteUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-bold underline flex items-center gap-1">
                      Comprovante Anexado <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto || !nomeRetirante.trim() || !fotoRetiranteUrl}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> Efetivar Baixa / Registrar Entrega
              </button>
            </form>
          )}

          {/* OVERLAY WHATSAPP BAIXA */}
          {baixaConcluidaWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">
                Baixa concluída com sucesso!
              </span>
              <a
                href={baixaConcluidaWhats.link}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Comprovante no WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVO ENTREGADOR */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-bold text-slate-900 text-base">Cadastro Rápido de Entregador</h4>
              <button onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={cadastrarEntregadorRapido} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">Nome Completo *</label>
                <input
                  type="text"
                  value={novoEntNome}
                  onChange={(e) => setNovoEntNome(e.target.value)}
                  required
                  placeholder="Ex: João Silva"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">Documento / RG / CPF</label>
                <input
                  type="text"
                  value={novoEntDoc}
                  onChange={(e) => setNovoEntDoc(e.target.value)}
                  placeholder="Ex: 12.345.678-9"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">Empresa / Transportadora</label>
                <input
                  type="text"
                  value={novoEntEmpresa}
                  onChange={(e) => setNovoEntEmpresa(e.target.value)}
                  placeholder="Ex: Mercado Livre, Amazon, Correios..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoEntregador(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !novoEntNome.trim()}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                >
                  Salvar Entregador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LEITOR DE CÂMERA */}
      {modalLeitor && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-slate-900 text-sm">Leitor de Código de Barras / QR</h4>
              <button onClick={fecharLeitorCamera} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {erroCamera ? (
              <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                {erroCamera}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl bg-black aspect-square flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-emerald-500/60 rounded-xl pointer-events-none animate-pulse" />
              </div>
            )}

            <button
              onClick={fecharLeitorCamera}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition"
            >
              Fechar Câmera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
