import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, Truck, CheckCircle2, AlertCircle, Search, Plus, UserCheck, Camera, X } from 'lucide-react';

export default function Encomendas({ usuarioLogado }) {
  const [abaAtiva, setAbaAtiva] = useState('receber'); // 'receber', 'painel', 'entregadores'
  const [entregadores, setEntregadores] = useState([]);
  const [encomendas, setEncomendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Formulário Recebimento
  const [loteRe, setLoteRe] = useState('');
  const [entregadorId, setEntregadorId] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [bloco, setBloco] = useState('');
  const [unidade, setUnidade] = useState('');
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [fotoEtiquetaUrl, setFotoEtiquetaUrl] = useState('');

  // Formulário Baixa
  const [encomendaBaixa, setEncomendaBaixa] = useState(null);
  const [retiradoPor, setRetiradoPor] = useState('');
  const [fotoRetiradaUrl, setFotoRetiradaUrl] = useState('');

  // Formulário Entregador
  const [nomeEntregador, setNomeEntregador] = useState('');
  const [documentoEntregador, setDocumentoEntregador] = useState('');
  const [empresaEntregador, setEmpresaEntregador] = useState('');

  // Busca
  const [termoBusca, setTermoBusca] = useState('');

  useEffect(() => {
    carregarDados();
  }, [abaAtiva]);

  const carregarDados = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);
    try {
      if (abaAtiva === 'entregadores') {
        const { data } = await supabase
          .from('entregadores')
          .select('*')
          .eq('condominio_id', usuarioLogado.condominio_id)
          .order('created_at', { ascending: false });
        setEntregadores(data || []);
      } else {
        const { data: entData } = await supabase
          .from('entregadores')
          .select('*')
          .eq('condominio_id', usuarioLogado.condominio_id);
        setEntregadores(entData || []);

        let query = supabase
          .from('encomendas')
          .select('*')
          .eq('condominio_id', usuarioLogado.condominio_id)
          .order('created_at', { ascending: false });

        if (termoBusca.trim()) {
          query = query.or(`unidade.ilike.%${termoBusca}%,destinatario_nome.ilike.%${termoBusca}%,lote_re.ilike.%${termoBusca}%`);
        }

        const { data } = await query;
        setEncomendas(data || []);
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao carregar dados: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const salvarEncomenda = async (e) => {
    e.preventDefault();
    if (!unidade.trim() || !destinatarioNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe a unidade e o nome do destinatário.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from('encomendas').insert([
        {
          condominio_id: usuarioLogado.condominio_id,
          entregador_id: entregadorId || null,
          lote_re: loteRe.trim() || `RE-${Math.floor(1000 + Math.random() * 9000)}`,
          transportadora: transportadora.trim(),
          destinatario_nome: destinatarioNome.trim(),
          bloco: bloco.trim(),
          unidade: unidade.trim(),
          codigo_rastreio: codigoRastreio.trim(),
          foto_etiqueta_url: fotoEtiquetaUrl.trim(),
          status: 'recebido'
        }
      ]);

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Encomenda registrada com sucesso!' });
      
      // Limpar formulário de encomenda mantendo o Lote RE para entrada sequencial
      setDestinatarioNome('');
      setBloco('');
      setUnidade('');
      setCodigoRastreio('');
      setFotoEtiquetaUrl('');
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao registrar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const darBaixaEncomenda = async (e) => {
    e.preventDefault();
    if (!retiradoPor.trim() || !encomendaBaixa) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('encomendas')
        .update({
          status: 'entregue',
          retirado_por: retiradoPor.trim(),
          foto_retirada_url: fotoRetiradaUrl.trim(),
          data_retirada: new Date().toISOString()
        })
        .eq('id', encomendaBaixa.id);

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Baixa efetuada com sucesso!' });
      setEncomendaBaixa(null);
      setRetiradoPor('');
      setFotoRetiradaUrl('');
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao dar baixa: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const salvarEntregador = async (e) => {
    e.preventDefault();
    if (!nomeEntregador.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('entregadores').insert([
        {
          condominio_id: usuarioLogado.condominio_id,
          nome: nomeEntregador.trim(),
          documento: documentoEntregador.trim(),
          empresa: empresaEntregador.trim()
        }
      ]);

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Entregador cadastrado!' });
      setNomeEntregador('');
      setDocumentoEntregador('');
      setEmpresaEntregador('');
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar entregador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Abas */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setAbaAtiva('receber')}
          className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
            abaAtiva === 'receber' ? 'border-slate-900 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500'
          }`}
        >
          <Package className="w-5 h-5" /> Recebimento (Lote RE)
        </button>

        <button
          onClick={() => setAbaAtiva('painel')}
          className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
            abaAtiva === 'painel' ? 'border-slate-900 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500'
          }`}
        >
          <Search className="w-5 h-5" /> Painel de Encomendas
        </button>

        <button
          onClick={() => setAbaAtiva('entregadores')}
          className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
            abaAtiva === 'entregadores' ? 'border-slate-900 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500'
          }`}
        >
          <Truck className="w-5 h-5" /> Entregadores
        </button>
      </div>

      {/* Alerta */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensagem.texto}
        </div>
      )}

      {/* ABA 1: RECEBIMENTO */}
      {abaAtiva === 'receber' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={salvarEncomenda} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Nova Encomenda
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lote / Código RE</label>
              <input
                type="text"
                value={loteRe}
                onChange={(e) => setLoteRe(e.target.value)}
                placeholder="Ex: RE-1042 (Gerado auto se vazio)"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Entregador / Empresa</label>
              <select
                value={entregadorId}
                onChange={(e) => {
                  setEntregadorId(e.target.value);
                  const ent = entregadores.find(x => x.id === e.target.value);
                  if (ent) setTransportadora(ent.empresa || '');
                }}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="">Selecione ou deixe em branco...</option>
                {entregadores.map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.nome} ({ent.empresa || 'Avulso'})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco</label>
                <input
                  type="text"
                  value={bloco}
                  onChange={(e) => setBloco(e.target.value)}
                  placeholder="Bloco A"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade *</label>
                <input
                  type="text"
                  required
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  placeholder="101"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destinatário *</label>
              <input
                type="text"
                required
                value={destinatarioNome}
                onChange={(e) => setDestinatarioNome(e.target.value)}
                placeholder="Nome do morador"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cód. Rastreio / Nota</label>
              <input
                type="text"
                value={codigoRastreio}
                onChange={(e) => setCodigoRastreio(e.target.value)}
                placeholder="Ex: BR123456789"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition"
            >
              Registrar Recebimento
            </button>
          </form>

          {/* Lista de Recebimentos Recentes */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Últimas Encomendas Recebidas</h3>
            <div className="space-y-3">
              {encomendas.filter(e => e.status === 'recebido').map((enc) => (
                <div key={enc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded mr-2">
                      {enc.lote_re}
                    </span>
                    <strong className="text-slate-900">{enc.destinatario_nome}</strong>
                    <p className="text-xs text-slate-500">
                      {enc.bloco ? `Bloco ${enc.bloco} - ` : ''}Unid: {enc.unidade} | Transp: {enc.transportadora || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEncomendaBaixa(enc)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition"
                  >
                    <UserCheck className="w-4 h-4" /> Dar Baixa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: PAINEL / BUSCA */}
      {abaAtiva === 'painel' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-slate-800">Todas as Encomendas</h3>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onKeyUp={carregarDados}
                placeholder="Buscar por unidade, nome ou RE..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            {encomendas.map((enc) => (
              <div key={enc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded">
                      {enc.lote_re}
                    </span>
                    <h4 className="font-bold text-slate-900">{enc.destinatario_nome}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {enc.bloco ? `Bloco ${enc.bloco} - ` : ''}Unidade {enc.unidade} | Recebido em: {new Date(enc.data_recebimento).toLocaleString('pt-BR')}
                  </p>
                  {enc.status === 'entregue' && (
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">
                      Retirado por: {enc.retirado_por} em {new Date(enc.data_retirada).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                <div>
                  {enc.status === 'recebido' ? (
                    <button
                      onClick={() => setEncomendaBaixa(enc)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition"
                    >
                      <UserCheck className="w-4 h-4" /> Dar Baixa
                    </button>
                  ) : (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                      Entregue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: ENTREGADORES */}
      {abaAtiva === 'entregadores' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={salvarEntregador} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" /> Novo Entregador
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Entregador</label>
              <input
                type="text"
                required
                value={nomeEntregador}
                onChange={(e) => setNomeEntregador(e.target.value)}
                placeholder="Ex: Carlos Entregas"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Empresa / App</label>
              <input
                type="text"
                value={empresaEntregador}
                onChange={(e) => setEmpresaEntregador(e.target.value)}
                placeholder="Ex: Mercado Livre, Amazon, Loggi"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Documento / RG</label>
              <input
                type="text"
                value={documentoEntregador}
                onChange={(e) => setDocumentoEntregador(e.target.value)}
                placeholder="00.000.000-0"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition"
            >
              Salvar Entregador
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Entregadores Cadastrados</h3>
            <div className="space-y-3">
              {entregadores.map((ent) => (
                <div key={ent.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">{ent.nome}</h4>
                    <p className="text-xs text-slate-500">
                      Empresa: {ent.empresa || 'Não informada'} | RG: {ent.documento || 'Não informado'}
                    </p>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                    Cadastrado
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BAIXA */}
      {encomendaBaixa && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={darBaixaEncomenda} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Dar Baixa na Encomenda</h3>
              <button type="button" onClick={() => setEncomendaBaixa(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <p><strong>Lote RE:</strong> {encomendaBaixa.lote_re}</p>
              <p><strong>Destinatário:</strong> {encomendaBaixa.destinatario_nome}</p>
              <p><strong>Unidade:</strong> {encomendaBaixa.unidade}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Retirante *</label>
              <input
                type="text"
                required
                value={retiradoPor}
                onChange={(e) => setRetiradoPor(e.target.value)}
                placeholder="Ex: O próprio morador, Filho, Esposa"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEncomendaBaixa(null)}
                className="flex-1 py-3 border border-slate-300 font-bold text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
              >
                Confirmar Baixa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
