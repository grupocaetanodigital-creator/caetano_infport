import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, Truck, CheckCircle2, AlertCircle, Search, Plus, UserCheck, AlertTriangle, MessageCircle, ExternalLink, X, ShieldAlert } from 'lucide-react';

export default function Encomendas({ usuarioLogado }) {
  const [etapa, setEtapa] = useState('1'); // '1' = Recebimento Lote RE, '2' = Triagem, '3' = Baixa/Saída
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Listas do Banco
  const [entregadores, setEntregadores] = useState([]);
  const [lotesPendentes, setLotesPendentes] = useState([]);
  const [moradores, setMoradores] = useState([]);
  const [pacotesRetidos, setPacotesRetidos] = useState([]);

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
  const [moradorSelecionado, setMoradorSelecionado] = useState(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [fotoEtiquetaUrl, setFotoEtiquetaUrl] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [alertaAgrupamento, setAlertaAgrupamento] = useState(null);
  const [itemTriadoWhats, setItemTriadoWhats] = useState(null);

  // Estados 3ª ETAPA: Saída / Baixa
  const [buscaBaixaUnidade, setBuscaBaixaUnidade] = useState('');
  const [itensParaBaixa, setItensParaBaixa] = useState([]);
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState([]);
  const [nomeRetirante, setNomeRetirante] = useState('');
  const [fotoRetiranteUrl, setFotoRetiranteUrl] = useState('');
  const [baixaConcluidaWhats, setBaixaConcluidaWhats] = useState(null);

  useEffect(() => {
    carregarDadosBase();
  }, [etapa]);

  const carregarDadosBase = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);
    try {
      // Carregar Entregadores
      const { data: entData } = await supabase
        .from('entregadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setEntregadores(entData || []);

      // Carregar Lotes Pendentes
      const { data: lotesData } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });
      setLotesPendentes(lotesData || []);

      // Carregar Moradores
      const { data: moradData } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id);
      setMoradores(moradData || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Tocar alerta sonoro nativo via Web Audio API
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

  // -------------------------------------------------------------
  // 1ª ETAPA: RECEBIMENTO DO LOTE RE
  // -------------------------------------------------------------
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
      setMensagem({ tipo: 'erro', texto: 'Selecione ou cadastre um entregador.' });
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
          operador_id: usuarioLogado.login
        }])
        .select('*, entregadores(nome, empresa, documento)')
        .single();

      if (error) throw error;

      // Gerar link de WhatsApp para Grupo da Administração
      const textoWhats = `📦 *NOVO LOTE DE ENCOMENDAS RECEBIDO (RE)*\nLote: ${data.codigo_re}\nTransportadora: ${data.entregadores?.empresa || 'N/A'}\nEntregador: ${data.entregadores?.nome} (Doc: ${data.entregadores?.documento || 'N/A'})\nTotal de Volumes Declarados: ${data.qtd_declarada} pacotes\nOperador: ${usuarioLogado.login}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;
      
      setLoteCriadoWhats({ codigo: data.codigo_re, link: `https://wa.me/?text=${encodeURIComponent(textoWhats)}` });
      setEntregadorSelecionado(null);
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
  const verificarAgrupamentoEBuscarMorador = async (unid, bloc) => {
    setUnidadeTriagem(unid);
    setBlocoTriagem(bloc);
    if (!unid.trim()) return;

    // Buscar Morador
    const morad = moradores.find(m => m.unidade.toLowerCase() === unid.toLowerCase());
    setMoradorSelecionado(morad || null);

    // Checar Agrupamento na tabela encomendas_itens
    const { data: itensRetidos } = await supabase
      .from('encomendas_itens')
      .select('*')
      .eq('condominio_id', usuarioLogado.condominio_id)
      .eq('unidade', unid.trim())
      .eq('status', 'retido');

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
      setMensagem({ tipo: 'erro', texto: 'Preencha a unidade e informe a URL da Foto da Etiqueta.' });
      return;
    }
    setLoading(true);

    try {
      // 1. Inserir Item
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

      // 2. Atualizar Lote RE
      const novaQtdTriada = (loteAtivo.qtd_triada || 0) + 1;
      const novoStatusLote = novaQtdTriada >= loteAtivo.qtd_declarada ? 'concluido' : 'em_triagem';

      await supabase
        .from('lotes_re')
        .update({ qtd_triada: novaQtdTriada, status: novoStatusLote })
        .eq('id', loteAtivo.id);

      // 3. Gerar link WhatsApp Morador
      const telMorador = moradorSelecionado?.telefone?.replace(/\D/g, '') || '';
      const textoWhatsMorador = `Olá, Apt ${unidadeTriagem} ${blocoTriagem ? 'Bloco ' + blocoTriagem : ''} - ${moradorSelecionado?.nome || 'Morador'}! 📦\nSua encomenda chegou na Portaria.\n\n• Lote/RE: ${loteAtivo.codigo_re}\n• Observação: ${observacoes || 'Nenhuma'}\n• Porteiro: ${usuarioLogado.login}\n• Data/Hora: ${new Date().toLocaleString('pt-BR')}\n• Foto da Etiqueta: ${fotoEtiquetaUrl}\n\nPor favor, retire na portaria assim que possível.`;

      setItemTriadoWhats({
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoWhatsMorador)}` : `https://wa.me/?text=${encodeURIComponent(textoWhatsMorador)}`
      });

      // Limpar form do item mantendo o lote ativo
      setUnidadeTriagem(''); setBlocoTriagem(''); setMoradorSelecionado(null);
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
  // 3ª ETAPA: SAÍDA / BAIXA DE ENCOMENDAS
  // -------------------------------------------------------------
  const buscarItensParaBaixa = async () => {
    if (!buscaBaixaUnidade.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('unidade', buscaBaixaUnidade.trim())
        .eq('status', 'retido');

      setItensParaBaixa(data || []);
      setItensSelecionadosIds((data || []).map(i => i.id));
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarBaixaSaida = async (e) => {
    e.preventDefault();
    if (itensSelecionadosIds.length === 0 || !nomeRetirante.trim() || !fotoRetiranteUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Selecione os pacotes, informe quem retirou e a URL da Foto do Retirante.' });
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
          operador_baixa_id: usuarioLogado.login
        })
        .in('id', itensSelecionadosIds);

      if (error) throw error;

      // WhatsApp Notificação Cruzada de Segurança
      const primeiroItem = itensParaBaixa[0];
      const telMorador = primeiroItem?.moradores?.telefone?.replace(/\D/g, '') || '';
      const textoCruzado = `✅ *CONFIRMAÇÃO DE RETIRADA DE ENCOMENDA*\nUnidade: Apt ${buscaBaixaUnidade}\n\nInformamos que o(s) pacote(s) foram RETIRADOS da portaria:\n• Qtd de Volumes Retirados: ${itensSelecionadosIds.length}\n• Quem Retirou: ${nomeRetirante}\n• Comprovante da Entrega: ${fotoRetiranteUrl}\n\nOperador Responsável: ${usuarioLogado.login}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setBaixaConcluidaWhats({
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoCruzado)}` : `https://wa.me/?text=${encodeURIComponent(textoCruzado)}`
      });

      setItensParaBaixa([]);
      setItensSelecionadosIds([]);
      setNomeRetirante(''); setFotoRetiranteUrl('');
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída realizada com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Card de alerta superior de lotes em triagem
  const totalPacotesPendentes = lotesPendentes.reduce((acc, l) => acc + (l.qtd_declarada - l.qtd_triada), 0);

  return (
    <div className="space-y-6">
      {/* Alerta Superior de Status dos Lotes */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Lotes em Triagem Pendentes</h4>
            <p className="text-xs text-amber-700">
              {lotesPendentes.length} lote(s) ativo(s) com um total de <strong>{totalPacotesPendentes} pacote(s) pendente(s)</strong> para individualizar.
            </p>
          </div>
        </div>
        <button
          onClick={() => setEtapa('2')}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
        >
          Ir para Triagem
        </button>
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
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensagem.texto}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1ª ETAPA — RECEBIMENTO DO LOTE (RE) */}
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
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Buscar / Selecionar Entregador *</label>
              <select
                required
                value={entregadorSelecionado?.id || ''}
                onChange={(e) => {
                  const ent = entregadores.find(x => x.id === e.target.value);
                  setEntregadorSelecionado(ent || null);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="">Selecione o entregador na lista...</option>
                {entregadores.map(ent => (
                  <option key={ent.id} value={ent.id}>
                    {ent.nome} — {ent.empresa || 'Avulso'} (Doc: {ent.documento || 'Sem doc'})
                  </option>
                ))}
              </select>
            </div>

            {entregadorSelecionado && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-1">
                <p><strong>Nome:</strong> {entregadorSelecionado.nome}</p>
                <p><strong>Empresa / Transportadora:</strong> {entregadorSelecionado.empresa || 'Não informada'}</p>
                <p><strong>Documento:</strong> {entregadorSelecionado.documento || 'Não informado'}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quantidade Total de Volumes Declarados *</label>
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
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition shadow-md text-base"
            >
              Criar Lote RE e Gerar Código
            </button>
          </form>

          {/* Botão de WhatsApp do Lote Criado */}
          {loteCriadoWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
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
      {/* 2ª ETAPA — TRIAGEM DO LOTE (INDIVIDUALIZAÇÃO) */}
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
            </div>
          </div>

          {/* Formulário de Pacote Individual */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">
              2. Individualizar Pacote {loteAtivo ? `— Lote ${loteAtivo.codigo_re}` : '(Selecione um lote)'}
            </h3>

            {/* CARD ALERTA DE AGRUPAMENTO (SE HOUVER PACOTES ANTERIORES) */}
            {alertaAgrupamento && (
              <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg animate-pulse space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-6 h-6" /> ⚠️ ATENÇÃO — AGRUPAMENTO DE PACOTES!
                </div>
                <p className="text-xs leading-relaxed">
                  A Unidade <strong>Apt {alertaAgrupamento.unidade} {alertaAgrupamento.bloco ? 'Bloco ' + alertaAgrupamento.bloco : ''}</strong> já possui <strong>{alertaAgrupamento.qtd} pacote(s) retido(s)</strong> na portaria.
                  Por favor, junte este novo pacote aos anteriores no mesmo local físico!
                </p>
              </div>
            )}

            <form onSubmit={salvarItemTriagem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / Ap *</label>
                  <input
                    type="text"
                    required
                    value={unidadeTriagem}
                    onChange={(e) => verificarAgrupamentoEBuscarMorador(e.target.value, blocoTriagem)}
                    placeholder="Ex: 102"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco</label>
                  <input
                    type="text"
                    value={blocoTriagem}
                    onChange={(e) => { setBlocoTriagem(e.target.value); verificarAgrupamentoEBuscarMorador(unidadeTriagem, e.target.value); }}
                    placeholder="Ex: B"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {moradorSelecionado && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                  Morador Vinculado: <strong>{moradorSelecionado.nome}</strong> | Tel: {moradorSelecionado.telefone || 'Sem tel'}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">URL da Foto da Etiqueta *</label>
                <input
                  type="url"
                  required
                  value={fotoEtiquetaUrl}
                  onChange={(e) => setFotoEtiquetaUrl(e.target.value)}
                  placeholder="https://supabase.co/.../foto.jpg"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cód. Barras / NF (Opcional)</label>
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Leitura de código..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações / Avarias</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Caixa amassada no canto superior"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !loteAtivo}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition"
              >
                Salvar Pacote na Portaria
              </button>
            </form>

            {/* Link WhatsApp Morador */}
            {itemTriadoWhats && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-emerald-900">
                  Notificação do Morador pronta para envio:
                </p>
                <a
                  href={itemTriadoWhats.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Notificar Morador no WhatsApp <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3ª ETAPA — SAÍDA / BAIXA DE ENCOMENDAS */}
      {/* ========================================================================= */}
      {etapa === '3' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">3ª Etapa — Saída e Baixa de Encomendas</h3>
              <p className="text-xs text-slate-500">Localize pacotes retidos e confirme a entrega ao morador.</p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={buscaBaixaUnidade}
                onChange={(e) => setBuscaBaixaUnidade(e.target.value)}
                placeholder="Digite a Unidade (Ex: 102)"
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm"
              />
              <button
                onClick={buscarItensParaBaixa}
                className="bg-slate-900 text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-slate-800 transition"
              >
                Buscar
              </button>
            </div>
          </div>

          {itensParaBaixa.length > 0 && (
            <form onSubmit={efetivarBaixaSaida} className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Pacotes Retidos para a Unidade {buscaBaixaUnidade}:</h4>
                {itensParaBaixa.map(item => (
                  <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={itensSelecionadosIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) setItensSelecionadosIds([...itensSelecionadosIds, item.id]);
                          else setItensSelecionadosIds(itensSelecionadosIds.filter(id => id !== item.id));
                        }}
                        className="w-5 h-5 accent-slate-900"
                      />
                      <div>
                        <strong className="text-sm text-slate-900">Unidade {item.unidade} {item.bloco ? `- Bloco ${item.bloco}` : ''}</strong>
                        <p className="text-xs text-slate-500">Obs: {item.observacoes || 'Sem observação'}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">
                      Retido na Portaria
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Retirante *</label>
                  <input
                    type="text"
                    required
                    value={nomeRetirante}
                    onChange={(e) => setNomeRetirante(e.target.value)}
                    placeholder="Ex: Pedro (Filho), Próprio Morador"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">URL Foto Retirante com Pacote *</label>
                  <input
                    type="url"
                    required
                    value={fotoRetiranteUrl}
                    onChange={(e) => setFotoRetiranteUrl(e.target.value)}
                    placeholder="https://supabase.co/.../baixa.jpg"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-md"
              >
                Efetivar Baixa de Saída e Gravar
              </button>
            </form>
          )}

          {/* Link WhatsApp Notificação Cruzada */}
          {baixaConcluidaWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-emerald-900">
                Notificação Cruzada de Confirmação de Retirada pronta:
              </p>
              <a
                href={baixaConcluidaWhats.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Confirmação de Retirada no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVO ENTREGADOR RÁPIDO */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={cadastrarEntregadorRapido} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Cadastro Rápido de Entregador</h3>
              <button type="button" onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={novoEntNome}
                onChange={(e) => setNovoEntNome(e.target.value)}
                placeholder="Ex: Marcos Antônio"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Empresa / Transportadora</label>
              <input
                type="text"
                value={novoEntEmpresa}
                onChange={(e) => setNovoEntEmpresa(e.target.value)}
                placeholder="Ex: Mercado Livre, Shopee, Amazon"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CPF ou RG</label>
              <input
                type="text"
                value={novoEntDoc}
                onChange={(e) => setNovoEntDoc(e.target.value)}
                placeholder="Ex: 783.871.847-76"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalNovoEntregador(false)}
                className="flex-1 py-3 border border-slate-300 font-bold text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
