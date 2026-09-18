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
  Square 
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
      // Define intervalo do dia atual (00:00:00 até 23:59:59)
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
        .select('*, entregadores(nome, empresa)')
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

      // 5. Métricas do Dia (Lotes criados hoje)
      const { data: lotesHojeData } = await supabase
        .from('lotes_re')
        .select('id, qtd_declarada, qtd_triada')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      // 6. Métricas do Dia (Itens triados hoje)
      const { data: triadosHojeData } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      // Cálculo dos Totais para os Displays
      const totalLotesHoje = lotesHojeData?.length || 0;
      const totalTriadasHoje = triadosHojeData?.length || 0;
      const totalAguardando = (lotesData || []).reduce((acc, l) => acc + (l.qtd_declarada - l.qtd_triada), 0);

      // Agrupamento por Bloco das Encomendas Retidas
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

  // Alertas sonoros nativos
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

  // Upload de Fotos no Supabase Storage
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

  // -------------------------------------------------------------
  // LEITOR DE CÓDIGO DE BARRAS E QR CODE VIA CÂMERA
  // -------------------------------------------------------------
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
      setErroCamera('Não foi possível aceder à câmara: ' + err.message);
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

  // -------------------------------------------------------------
  // 1ª ETAPA: RECEBIMENTO DO LOTE RE
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 2ª ETAPA: TRIAGEM INDIVIDUAL
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 3ª ETAPA: SAÍDA / BAIXA COM FILTROS DE CÓDIGO/QR E BLOCOS
  // -------------------------------------------------------------
  const itensRetidosFiltrados = todosItensRetidos.filter(item => {
    // Filtro por Aba de Bloco
    if (abaBlocoSelecionada !== 'TODOS') {
      const blocoItem = item.bloco ? `Bloco ${item.bloco}` : 'Geral / Sem Bloco';
      if (blocoItem !== abaBlocoSelecionada) return false;
    }

    // Filtro por Texto de Busca (Unidade, Bloco, Código de Barras, Nome Morador)
    if (!buscaBaixaGeral.trim()) return true;
    const termo = buscaBaixaGeral.toLowerCase().trim();
    const unid = item.unidade?.toString().toLowerCase() || '';
    const bloc = item.bloco?.toString().toLowerCase() || '';
    const cod = item.codigo_barras?.toString().toLowerCase() || '';
    const moradorNome = item.moradores?.nome?.toLowerCase() || '';

    return unid.includes(termo) || bloc.includes(termo) || cod.includes(termo) || moradorNome.includes(termo);
  });

  const toggleItemSelecao = (id) => {
    if (itensSelecionadosIds.includes(id)) {
      setItensSelecionadosIds(itensSelecionadosIds.filter(item => item !== id));
    } else {
      setItensSelecionadosIds([...itensSelecionadosIds, id]);
    }
  };

  const selecionarTodosFiltrados = () => {
    const ids = itensRetidosFiltrados.map(i => i.id);
    setItensSelecionadosIds(ids);
  };

  const deselecionarTodos = () => {
    setItensSelecionadosIds([]);
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

  const blocosParaAbas = ['TODOS', ...Object.keys(statsDia.retidosPorBloco)];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      /* PAINEL DE METRICAS E CONTADORES DO DIA (00:00 ÀS 23:59)                   */
      {/* ========================================================================= */}
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

      {/* DISPLAI DE PACOTES RETIDOS POR BLOCO */}
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

      {/* ========================================================================= */}
      {/* 1ª ETAPA — RECEBIMENTO DO LOTE (RE)                                      */}
      {/* ========================================================================= */}
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
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                      Entregador Selecionado
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1">{entregadorSelecionado.nome}</p>
                    <p className="text-xs text-slate-600">
                      {entregadorSelecionado.empresa ? `Empresa: ${entregadorSelecionado.empresa}` : 'Avulso'} • Doc: {entregadorSelecionado.documento || 'Sem doc'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEntregadorSelecionado(null)}
                    className="text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Trocar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Quantidade Total de Volumes Declarados *
              </label>
              <input
                type="number"
                min="1"
                required
                value={qtdDeclarada}
                onChange={(e) => setQtdDeclarada(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-lg font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !entregadorSelecionado}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition shadow-md text-base"
            >
              Criar Lote RE e Gerar Código
            </button>
          </form>

          {loteCriadoWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-2xl">
              <p className="text-xs font-bold text-emerald-900">
                Lote {loteCriadoWhats.codigo} gerado! Dispare o aviso para a gestão:
              </p>
              <a
                href={loteCriadoWhats.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Aviso no WhatsApp da Gestão <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2ª ETAPA — TRIAGEM DO LOTE (INDIVIDUALIZAÇÃO)                            */}
      {/* ========================================================================= */}
      {etapa === '2' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Seleção do Lote */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">1. Selecione o Lote em Triagem</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lotesPendentes.map(lote => (
                <div
                  key={lote.id}
                  onClick={() => setLoteAtivo(lote)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    loteAtivo?.id === lote.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                >
                  <strong className="text-xs block font-mono">{lote.codigo_re}</strong>
                  <p className="text-xs opacity-80">{lote.entregadores?.nome} ({lote.entregadores?.empresa})</p>
                  <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded mt-1 inline-block font-bold">
                    Triados: {lote.qtd_triada} / {lote.qtd_declarada}
                  </span>
                </div>
              ))}
              {lotesPendentes.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  Nenhum lote pendente de triagem no momento.
                </p>
              )}
            </div>
          </div>

          {/* Formulário de Triagem Individual */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">
              2. Dados do Pacote Individual {loteAtivo ? `(Lote: ${loteAtivo.codigo_re})` : ''}
            </h3>

            {loteAtivo ? (
              <form onSubmit={salvarItemTriagem} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / Apt *</label>
                    <input
                      type="text"
                      required
                      value={unidadeTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(e.target.value, blocoTriagem)}
                      placeholder="Ex: 101"
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco (Se houver)</label>
                    <input
                      type="text"
                      value={blocoTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value)}
                      placeholder="Ex: A"
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                  </div>
                </div>

                {/* Alerta de Agrupamento */}
                {alertaAgrupamento && (
                  <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-900 text-xs font-bold animate-pulse flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-700" />
                    <span>ALERTA DE AGRUPAMENTO: Já existem {alertaAgrupamento.qtd} pacote(s) retido(s) para o Apt {alertaAgrupamento.unidade}!</span>
                  </div>
                )}

                {/* Moradores Encontrados */}
                {moradoresDaUnidade.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Morador Destinatário</label>
                    <select
                      value={moradorSelecionado?.id || ''}
                      onChange={(e) => setMoradorSelecionado(moradoresDaUnidade.find(m => m.id === e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      {moradoresDaUnidade.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} (Tel: {m.telefone || 'Sem telefone'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Código de Barras e Leitor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código de Barras / Rastreio</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      placeholder="Digite ou escaneie o código de barras..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => abrirLeitorCamera('triagem')}
                      className="bg-slate-800 text-white px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-700 transition"
                    >
                      <QrCode className="w-4 h-4" /> Ler Barcode/QR
                    </button>
                  </div>
                </div>

                {/* Foto da Etiqueta / Pacote */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Foto do Pacote / Etiqueta *</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold px-4 py-3 rounded-lg text-xs flex items-center gap-2 transition">
                      <Camera className="w-4 h-4" /> Tire a Foto com a Câmera
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => uploadFotoStorage(e.target.files[0], 'etiquetas', setFotoEtiquetaUrl)}
                      />
                    </label>

                    {uploadingFoto && <span className="text-xs text-amber-600 font-bold animate-pulse">Enviando foto...</span>}
                    {fotoEtiquetaUrl && (
                      <a href={fotoEtiquetaUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 underline font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Foto Anexada
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Caixas grandes, frágil, caixa amassada..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || uploadingFoto || !fotoEtiquetaUrl}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition shadow text-sm"
                >
                  Salvar Pacote e Notificar Morador
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-500 italic py-8 text-center">
                Selecione um lote pendente à esquerda para iniciar a triagem.
              </p>
            )}

            {itemTriadoWhats && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <p className="text-xs text-emerald-900 font-bold">Aviso WhatsApp gerado para {itemTriadoWhats.destinatario}:</p>
                <a
                  href={itemTriadoWhats.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-md hover:bg-emerald-700 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar Mensagem para o Morador
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3ª ETAPA — SAÍDA / BAIXA DE ENCOMENDAS (COM BUSCA CÓDIGO/QR E BLOCOS)   */}
      {/* ========================================================================= */}
      {etapa === '3' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b pb-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-slate-800" /> Entrega e Baixa de Encomendas Retidas
              </h3>
              <p className="text-xs text-slate-500">Busque por Código de Barras/QR, Unidade, Bloco ou Nome do Morador.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={selecionarTodosFiltrados}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition"
              >
                <CheckSquare className="w-4 h-4" /> Marcar Todos Visíveis
              </button>
              {itensSelecionadosIds.length > 0 && (
                <button
                  onClick={deselecionarTodos}
                  className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition"
                >
                  <Square className="w-4 h-4" /> Limpar Seleção ({itensSelecionadosIds.length})
                </button>
              )}
            </div>
          </div>

          {/* BARRA DE BUSCA AVANÇADA POR BARCODE / UNIDADE / BLOCO */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={buscaBaixaGeral}
                onChange={(e) => setBuscaBaixaGeral(e.target.value)}
                placeholder="Escaneie o Código de Barras / QR Code ou digite Apt, Bloco ou Nome..."
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
              {buscaBaixaGeral && (
                <button
                  onClick={() => setBuscaBaixaGeral('')}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => abrirLeitorCamera('baixa')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition"
            >
              <QrCode className="w-5 h-5" /> Ler Câmera (QR / Barcode)
            </button>
          </div>

          {/* ABAS DISPLEI POR BLOCO */}
          {blocosParaAbas.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase mr-1">
                <Layers className="w-3.5 h-3.5" /> Filtrar Bloco:
              </span>
              {blocosParaAbas.map((blocoNome) => {
                const qtdNoBloco = blocoNome === 'TODOS' 
                  ? todosItensRetidos.length 
                  : (statsDia.retidosPorBloco[blocoNome] || 0);

                return (
                  <button
                    key={blocoNome}
                    onClick={() => setAbaBlocoSelecionada(blocoNome)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      abaBlocoSelecionada === blocoNome
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{blocoNome}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      abaBlocoSelecionada === blocoNome ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-800'
                    }`}>
                      {qtdNoBloco}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* LISTA DE ITENS RETIDOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-1">
            {itensRetidosFiltrados.length > 0 ? (
              itensRetidosFiltrados.map((item) => {
                const isSelected = itensSelecionadosIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelecao(item.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                      isSelected ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500' : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                          Apt {item.unidade} {item.bloco ? `• Bloco ${item.bloco}` : ''}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">
                          {item.moradores?.nome || 'Morador não vinculado'}
                        </h4>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400 bg-white'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>

                    {item.codigo_barras && (
                      <p className="text-xs font-mono text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                        Cód: {item.codigo_barras}
                      </p>
                    )}

                    {item.foto_etiqueta_url && (
                      <img
                        src={item.foto_etiqueta_url}
                        alt="Foto Pacote"
                        className="w-full h-28 object-cover rounded-lg border border-slate-200"
                      />
                    )}

                    <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
                      <p>Chegou em: {new Date(item.created_at).toLocaleString('pt-BR')}</p>
                      {item.observacoes && <p className="italic text-slate-700">Obs: {item.observacoes}</p>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
                Nenhuma encomenda retida encontrada com os filtros selecionados.
              </div>
            )}
          </div>

          {/* FORMULÁRIO DE CONFIRMAÇÃO DE RETIRADA */}
          {itensSelecionadosIds.length > 0 && (
            <form onSubmit={efetivarBaixaSaida} className="bg-slate-900 text-white p-6 rounded-xl space-y-4 shadow-lg">
              <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Confirmar Entrega de {itensSelecionadosIds.length} pacote(s) selecionado(s)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Nome do Retirante *</label>
                  <input
                    type="text"
                    required
                    value={nomeRetirante}
                    onChange={(e) => setNomeRetirante(e.target.value)}
                    placeholder="Quem está retirando na portaria..."
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Foto da Comprovação de Entrega *</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold px-4 py-3 rounded-lg text-xs flex items-center gap-2 transition">
                      <Camera className="w-4 h-4 text-emerald-400" /> Tirar Foto da Entrega
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => uploadFotoStorage(e.target.files[0], 'retiradas', setFotoRetiranteUrl)}
                      />
                    </label>

                    {uploadingFoto && <span className="text-xs text-amber-400 font-bold animate-pulse">Salvando foto...</span>}
                    {fotoRetiranteUrl && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Foto Gravada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto || !fotoRetiranteUrl || !nomeRetirante.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold py-4 rounded-xl transition shadow-md text-base"
              >
                Concluir Baixa de Saída e Notificar Morador
              </button>
            </form>
          )}

          {baixaConcluidaWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-emerald-900">Baixa registrada com sucesso! Dispare a confirmação:</p>
              <a
                href={baixaConcluidaWhats.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Comprovante de Retirada no WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* MODAL LEITOR DE CÓDIGO DE BARRAS / QR CODE DA CÂMERA */}
      {modalLeitor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <QrCode className="w-5 h-5" /> Leitor de Barcode & QR Code
              </h4>
              <button onClick={fecharLeitorCamera} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {erroCamera ? (
              <p className="text-xs text-red-400 p-4 bg-red-950/50 rounded-lg">{erroCamera}</p>
            ) : (
              <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500">
                <video ref={videoRef} className="w-full h-64 object-cover" />
                <div className="absolute inset-0 border-2 border-dashed border-emerald-400/60 pointer-events-none m-8 rounded-lg animate-pulse" />
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">
              Aponte a câmera para a etiqueta do pacote. O código será detectado automaticamente.
            </p>

            <button
              onClick={fecharLeitorCamera}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 rounded-xl transition"
            >
              Cancelar Leitura
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOVO ENTREGADOR */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-bold text-slate-900 text-sm">+ Cadastro Rápido de Entregador</h4>
              <button onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={cadastrarEntregadorRapido} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Entregador *</label>
                <input
                  type="text"
                  required
                  value={novoEntNome}
                  onChange={(e) => setNovoEntNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Empresa / Transportadora</label>
                <input
                  type="text"
                  value={novoEntEmpresa}
                  onChange={(e) => setNovoEntEmpresa(e.target.value)}
                  placeholder="Ex: Mercado Livre, Amazon, Correios..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Documento (RG/CPF)</label>
                <input
                  type="text"
                  value={novoEntDoc}
                  onChange={(e) => setNovoEntDoc(e.target.value)}
                  placeholder="Ex: 00.000.000-0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow"
              >
                Salvar e Selecionar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
