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

  // 3ª ETAPA: SAÍDA / BAIXA COM FILTROS AVANÇADOS (EX: "24A", "01B", CÓDIGO OU NOME)
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

    // Combinações para permitir buscas como "24A", "01B", "24 A"
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
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-lg font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !entregadorSelecionado}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Truck className="w-5 h-5" />
              {loading ? 'Gerando Lote...' : 'Gerar Lote de Recebimento (RE)'}
            </button>
          </form>

          {/* WhatsApp Notificação de Criado */}
          {loteCriadoWhats && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Lote {loteCriadoWhats.codigo} registrado!</h4>
                  <p className="text-xs text-emerald-700">Deseja enviar a notificação do lote recebido via WhatsApp?</p>
                </div>
              </div>
              <a
                href={loteCriadoWhats.link}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4" /> Compartilhar WhatsApp
              </a>
            </div>
          )}

          {/* Lotes em Aberto/Aguardando Triagem */}
          <div className="border-t pt-6 space-y-4">
            <h4 className="text-sm font-bold uppercase text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Lotes Aguardando Triagem
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lotesPendentes.length > 0 ? (
                lotesPendentes.map((lote) => (
                  <div key={lote.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <strong className="text-sm font-black text-slate-900 font-mono">{lote.codigo_re}</strong>
                        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {lote.qtd_triada} / {lote.qtd_declarada} triados
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Entregador: <strong>{lote.entregadores?.nome || 'Não informado'}</strong> ({lote.entregadores?.empresa || 'Avulso'})
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Criado em: {new Date(lote.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setLoteAtivo(lote);
                        setEtapa('2');
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Package className="w-4 h-4" /> Iniciar / Continuar Triagem
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic col-span-2">Nenhum lote pendente de triagem no momento.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2ª ETAPA — TRIAGEM INDIVIDUAL DO LOTE */}
      {etapa === '2' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Package className="w-6 h-6 text-slate-800" /> Triagem de Pacotes
              </h3>
              <p className="text-xs text-slate-500">Registre cada pacote recebido do lote selecionado</p>
            </div>

            {loteAtivo && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Lote Ativo</span>
                <strong className="text-sm font-mono font-bold text-slate-900">{loteAtivo.codigo_re}</strong>
              </div>
            )}
          </div>

          {!loteAtivo ? (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="text-base font-bold text-amber-900">Nenhum Lote Selecionado</h4>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                Para iniciar a triagem de encomendas, selecione um lote pendente na 1ª Etapa ou crie um novo lote de recebimento.
              </p>
              <button
                onClick={() => setEtapa('1')}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                Voltar para Recebimento (1ª Etapa)
              </button>
            </div>
          ) : (
            <form onSubmit={salvarItemTriagem} className="space-y-5">
              {/* ALERTA DE AGRUPAMENTO DE ENCOMENDAS */}
              {alertaAgrupamento && (
                <div className="bg-amber-500 text-slate-950 p-4 rounded-xl border border-amber-600 shadow-sm flex items-center gap-3 animate-pulse">
                  <AlertCircle className="w-7 h-7 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">Atenção: Agrupamento Identificado!</h4>
                    <p className="text-xs font-bold mt-0.5">
                      Esta unidade (Apt {alertaAgrupamento.unidade}{alertaAgrupamento.bloco ? ' - Bloco ' + alertaAgrupamento.bloco : ''}) já possui{' '}
                      <u className="font-black">{alertaAgrupamento.qtd} pacote(s)</u> aguardando retirada na portaria!
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CAMPO UNIDADE: Teclado Numérico forçado via inputMode="numeric" */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Unidade (Apt / Casa) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={unidadeTriagem}
                    onChange={(e) => buscarMoradoresEChecarAgrupamento(e.target.value, blocoTriagem)}
                    placeholder="Ex: 101"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    required
                  />
                </div>

                {/* CAMPO BLOCO: LISTA DROPDOWN SELECIONÁVEL DE BLOCOS DO CONDOMÍNIO */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Bloco (Selecione)</label>
                  <select
                    value={blocoTriagem}
                    onChange={(e) => buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                  >
                    <option value="">Selecione o Bloco (Opcional)</option>
                    {blocosDisponiveis.map((b) => (
                      <option key={b} value={b}>
                        Bloco {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MORADOR VINCULADO */}
              {moradoresDaUnidade.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Morador Destinatário Identificado</label>
                  <select
                    value={moradorSelecionado?.id || ''}
                    onChange={(e) => {
                      const m = moradoresDaUnidade.find(item => item.id === e.target.value);
                      setMoradorSelecionado(m || null);
                    }}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:outline-none"
                  >
                    {moradoresDaUnidade.map((mor) => (
                      <option key={mor.id} value={mor.id}>
                        {mor.nome} {mor.telefone ? `(${mor.telefone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CÓDIGO DE BARRAS / RASTREIO E BOTÃO CÂMERA */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Código de Rastreio / Etiqueta</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    placeholder="Digite ou bip o código da encomenda..."
                    className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                  />
                  <button
                    type="button"
                    onClick={() => abrirLeitorCamera('triagem')}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2 transition"
                  >
                    <QrCode className="w-5 h-5" /> Ler Câmera
                  </button>
                </div>
              </div>

              {/* FOTO DA ETIQUETA / ENCOMENDA */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Pacote / Etiqueta *</label>
                {fotoEtiquetaUrl ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-300">
                    <img src={fotoEtiquetaUrl} alt="Foto Etiqueta" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoEtiquetaUrl('')}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Tirar / Anexar Foto da Encomenda</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          uploadFotoStorage(e.target.files[0], 'triagem', setFotoEtiquetaUrl);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                {uploadingFoto && <p className="text-xs text-amber-600 font-bold animate-pulse">Enviando foto...</p>}
              </div>

              {/* OBSERVAÇÕES */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Observações (Avarias, Amassado, Caixa Grande)</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Caixa grande, levemente amassada do lado..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {loading ? 'Salvando...' : 'Concluir Triagem deste Pacote'}
              </button>
            </form>
          )}

          {/* Notificação Whats Triagem */}
          {itemTriadoWhats && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Notificação Pronta para {itemTriadoWhats.destinatario}!</h4>
                  <p className="text-xs text-emerald-700">Avisar morador sobre a chegada do pacote via WhatsApp.</p>
                </div>
              </div>
              <a
                href={itemTriadoWhats.link}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4" /> Enviar Aviso WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* 3ª ETAPA — SAÍDA / BAIXA DE ENCOMENDAS */}
      {etapa === '3' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-slate-800" /> Entrega e Saída de Encomendas
              </h3>
              <p className="text-xs text-slate-500">Selecione os pacotes retidos para realizar a baixa com foto do retirante</p>
            </div>
          </div>

          {/* BUSCA AVANÇADA (SUPORTE A "24A", "01B", UNIDADE, BLOCO OU CÓDIGO) */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={buscaBaixaGeral}
                  onChange={(e) => setBuscaBaixaGeral(e.target.value)}
                  placeholder="Buscar por unidade/bloco (ex: 24A, 01B), morador ou código de rastreio..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>
              <button
                type="button"
                onClick={() => abrirLeitorCamera('baixa')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2 transition"
              >
                <QrCode className="w-5 h-5" /> Ler Câmera
              </button>
            </div>

            {/* ABAS POR BLOCO PARA FILTRO RÁPIDO */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['TODOS', ...Object.keys(statsDia.retidosPorBloco)].map((blocoAba) => (
                <button
                  key={blocoAba}
                  onClick={() => setAbaBlocoSelecionada(blocoAba)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    abaBlocoSelecionada === blocoAba
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {blocoAba}
                </button>
              ))}
            </div>
          </div>

          {/* LISTA DE ENCOMENDAS RETIDAS PARA SELEÇÃO */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
              <span>Encomendas Encontradas: {itensRetidosFiltrados.length}</span>
              <div className="flex gap-3">
                <button type="button" onClick={selecionarTodosFiltrados} className="text-emerald-700 hover:underline">
                  Selecionar Todos
                </button>
                <button type="button" onClick={deselecionarTodos} className="text-red-600 hover:underline">
                  Limpar Seleção
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {itensRetidosFiltrados.length > 0 ? (
                itensRetidosFiltrados.map((item) => {
                  const marcado = itensSelecionadosIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemSelecao(item.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                        marcado ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {marcado ? (
                          <CheckSquare className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-400 flex-shrink-0" />
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-black text-slate-900">
                              Apt {item.unidade} {item.bloco ? ` - Bloco ${item.bloco}` : ''}
                            </strong>
                            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              {item.codigo_barras || 'Sem Cód'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Destinatário: <strong>{item.moradores?.nome || 'Não vinculado'}</strong>
                          </p>
                          {item.observacoes && (
                            <p className="text-[11px] text-amber-700 italic mt-0.5">Obs: {item.observacoes}</p>
                          )}
                        </div>
                      </div>

                      {item.foto_etiqueta_url && (
                        <img
                          src={item.foto_etiqueta_url}
                          alt="Foto Pacote"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 italic">
                  Nenhuma encomenda retida encontrada com o termo pesquisado.
                </div>
              )}
            </div>
          </div>

          {/* FORMULÁRIO DE BAIXA / COMPROVANTE */}
          {itensSelecionadosIds.length > 0 && (
            <form onSubmit={efetivarBaixaSaida} className="bg-slate-50 p-5 rounded-xl border border-slate-300 space-y-4">
              <h4 className="text-sm font-bold uppercase text-slate-800 border-b pb-2 flex items-center justify-between">
                <span>Dados de Quem Está Retirando ({itensSelecionadosIds.length} selecionado(s))</span>
              </h4>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Nome de Quem Retirou *</label>
                <input
                  type="text"
                  value={nomeRetirante}
                  onChange={(e) => setNomeRetirante(e.target.value)}
                  placeholder="Nome do morador ou autorizado..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Comprovante de Entrega *</label>
                {fotoRetiranteUrl ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-300">
                    <img src={fotoRetiranteUrl} alt="Comprovante" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoRetiranteUrl('')}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Tirar Foto da Entrega / Pessoa</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          uploadFotoStorage(e.target.files[0], 'saida', setFotoRetiranteUrl);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                {uploadingFoto && <p className="text-xs text-amber-600 font-bold animate-pulse">Enviando foto...</p>}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                <UserCheck className="w-5 h-5" />
                {loading ? 'Processando Baixa...' : 'Efetivar Baixa de Saída'}
              </button>
            </form>
          )}

          {/* Notificação Whats Baixa Cruzada */}
          {baixaConcluidaWhats && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Baixa Realizada com Sucesso!</h4>
                  <p className="text-xs text-emerald-700">Enviar confirmação cruzada de saída ao morador via WhatsApp.</p>
                </div>
              </div>
              <a
                href={baixaConcluidaWhats.link}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4" /> Enviar Comprovante WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* MODAL CADASTRAR NOVO ENTREGADOR RÁPIDO */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Cadastro Rápido de Entregador
              </h3>
              <button onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={cadastrarEntregadorRapido} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Nome do Entregador *</label>
                <input
                  type="text"
                  value={novoEntNome}
                  onChange={(e) => setNovoEntNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Documento (RG / CPF)</label>
                <input
                  type="text"
                  value={novoEntDoc}
                  onChange={(e) => setNovoEntDoc(e.target.value)}
                  placeholder="Ex: 12.345.678-9"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Empresa / Transportadora</label>
                <input
                  type="text"
                  value={novoEntEmpresa}
                  onChange={(e) => setNovoEntEmpresa(e.target.value)}
                  placeholder="Ex: Mercado Livre, Amazon, Shopee..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoEntregador(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Salvar Entregador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LEITOR CÂMERA */}
      {modalLeitor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-slate-800" /> Leitor de Código de Barras / QR Code
              </h3>
              <button onClick={fecharLeitorCamera} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {erroCamera ? (
              <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl">{erroCamera}</div>
            ) : (
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 border-2 border-emerald-500/50 m-8 rounded-lg pointer-events-none animate-pulse flex items-center justify-center">
                  <span className="text-[10px] text-emerald-400 font-bold bg-black/60 px-2 py-1 rounded">
                    Aponte para o código
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={fecharLeitorCamera}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-xl text-xs"
            >
              Fechar Câmera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
