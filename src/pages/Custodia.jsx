import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  ShieldCheck, 
  PackagePlus, 
  PackageCheck, 
  Camera, 
  Search, 
  MessageCircle, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  ArrowRight
} from 'lucide-react';

export default function Custodia({ usuarioLogado }) {
  const [aba, setAba] = useState('entrada'); // 'entrada' ou 'saida'
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Listas de apoio
  const [moradores, setMoradores] = useState([]);
  const [itensGuardados, setItensGuardados] = useState([]);

  // Form Entrada de Custódia
  const [fluxo, setFluxo] = useState('M-M'); // 'M-M', 'M-T', 'T-M'
  
  // Origem
  const [origemUnidade, setOrigemUnidade] = useState('');
  const [origemBloco, setOrigemBloco] = useState('');
  const [origemNome, setOrigemNome] = useState('');
  const [origemWhats, setOrigemWhats] = useState('');

  // Destino
  const [destinoUnidade, setDestinoUnidade] = useState('');
  const [destinoBloco, setDestinoBloco] = useState('');
  const [destinoNome, setDestinoNome] = useState('');
  const [destinoWhats, setDestinoWhats] = useState('');

  // Item e Foto
  const [descricaoItem, setDescricaoItem] = useState('');
  const [fotoEntradaUrl, setFotoEntradaUrl] = useState('');
  const [whatsEntradaLink, setWhatsEntradaLink] = useState(null);

  // Form Saída / Baixa
  const [buscaTermo, setBuscaTermo] = useState('');
  const [itemSelecionadoSaida, setItemSelecionadoSaida] = useState(null);
  const [recebedorNome, setRecebedorNome] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [fotoSaidaUrl, setFotoSaidaUrl] = useState('');
  const [whatsSaidaLink, setWhatsSaidaLink] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [aba]);

  const carregarDados = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      // Carregar moradores para autocompletar
      const { data: moradData } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setMoradores(moradData || []);

      // Carregar itens retidos na portaria
      const { data: custodiaData } = await supabase
        .from('custodia')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'Aguardando Retirada')
        .order('created_at', { ascending: false });
      setItensGuardados(custodiaData || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Upload no Supabase Storage
  const uploadFotoStorage = async (file, pasta, setUrlCallback) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('encomendas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encomendas')
        .getPublicUrl(fileName);

      setUrlCallback(urlData.publicUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto salva com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  // Preenchimento automático ao selecionar morador na Origem
  const selecionarOrigemMorador = (unid, bloc) => {
    setOrigemUnidade(unid);
    setOrigemBloco(bloc);
    const m = moradores.find(x => 
      x.unidade?.toString().toLowerCase() === unid.trim().toLowerCase() &&
      (!bloc.trim() || x.bloco?.toString().toLowerCase() === bloc.trim().toLowerCase())
    );
    if (m) {
      setOrigemNome(m.nome);
      setOrigemWhats(m.telefone || '');
    }
  };

  // Preenchimento automático ao selecionar morador no Destino
  const selecionarDestinoMorador = (unid, bloc) => {
    setDestinoUnidade(unid);
    setDestinoBloco(bloc);
    const m = moradores.find(x => 
      x.unidade?.toString().toLowerCase() === unid.trim().toLowerCase() &&
      (!bloc.trim() || x.bloco?.toString().toLowerCase() === bloc.trim().toLowerCase())
    );
    if (m) {
      setDestinoNome(m.nome);
      setDestinoWhats(m.telefone || '');
    }
  };

  // Registrar Guarda de Item
  const salvarEntradaCustodia = async (e) => {
    e.preventDefault();
    if (!descricaoItem.trim() || !fotoEntradaUrl.trim() || !origemNome.trim() || !destinoNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha a origem, destino, descrição do item e tire a foto.' });
      return;
    }
    setLoading(true);

    try {
      const seq = Math.floor(1000 + Math.random() * 9000);
      const codigoCustodia = `CUST-${new Date().getFullYear()}-${seq}`;

      const novoRegistro = {
        condominio_id: usuarioLogado.condominio_id,
        codigo_custodia: codigoCustodia,
        fluxo,
        origem_tipo: fluxo.startsWith('M') ? 'Morador' : 'Terceiro',
        origem_unidade: origemUnidade.trim(),
        origem_bloco: origemBloco.trim(),
        origem_nome_doc: origemNome.trim(),
        origem_whats: origemWhats.trim(),
        destino_tipo: fluxo.endsWith('M') ? 'Morador' : 'Terceiro',
        destino_unidade: destinoUnidade.trim(),
        destino_bloco: destinoBloco.trim(),
        destino_nome_doc: destinoNome.trim(),
        destino_whats: destinoWhats.trim(),
        descricao: descricaoItem.trim(),
        foto_entrada_url: fotoEntradaUrl.trim(),
        status: 'Aguardando Retirada',
        operador_entrada: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
      };

      const { data, error } = await supabase
        .from('custodia')
        .insert([novoRegistro])
        .select()
        .single();

      if (error) throw error;

      // Gerar notificação WhatsApp para o Destinatário
      const telDestino = destinoWhats.replace(/\D/g, '');
      const textoWhats = `🔑 *ITEM EM CUSTÓDIA NA PORTARIA*\nCódigo: ${codigoCustodia}\nDe: ${origemNome} (${origemUnidade ? 'Apt ' + origemUnidade : 'Terceiro'})\nPara: ${destinoNome}\nDescrição: ${descricaoItem}\nFoto do Objeto: ${fotoEntradaUrl}\n\nPor favor, retire na guarita informando o código!`;

      setWhatsEntradaLink({
        codigo: codigoCustodia,
        link: telDestino ? `https://wa.me/55${telDestino}?text=${encodeURIComponent(textoWhats)}` : `https://wa.me/?text=${encodeURIComponent(textoWhats)}`
      });

      // Reset de campos
      setOrigemUnidade(''); setOrigemBloco(''); setOrigemNome(''); setOrigemWhats('');
      setDestinoUnidade(''); setDestinoBloco(''); setDestinoNome(''); setDestinoWhats('');
      setDescricaoItem(''); setFotoEntradaUrl('');
      carregarDados();
      setMensagem({ tipo: 'sucesso', texto: `Item guardado com sucesso! Código: ${codigoCustodia}` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Efetivar Saída de Custódia
  const efetivarSaidaCustodia = async (e) => {
    e.preventDefault();
    if (!itemSelecionadoSaida || !recebedorNome.trim() || !fotoSaidaUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do retirante e tire a foto do comprovante.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('custodia')
        .update({
          status: 'Retirado',
          data_hora_saida: new Date().toISOString(),
          recebedor_nome: recebedorNome.trim(),
          recebedor_doc: recebedorDoc.trim(),
          foto_saida_url: fotoSaidaUrl.trim(),
          operador_saida: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
        })
        .eq('id', itemSelecionadoSaida.id);

      if (error) throw error;

      // Notificação de Confirmação no WhatsApp para quem Deixou o Objeto
      const telOrigem = itemSelecionadoSaida.origem_whats?.replace(/\D/g, '') || '';
      const textoConfirmacao = `✅ *ITEM ENTREGUE COM SUCESSO*\nCódigo: ${itemSelecionadoSaida.codigo_custodia}\nObjeto: ${itemSelecionadoSaida.descricao}\nRetirado Por: ${recebedorNome}\nComprovante: ${fotoSaidaUrl}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setWhatsSaidaLink({
        link: telOrigem ? `https://wa.me/55${telOrigem}?text=${encodeURIComponent(textoConfirmacao)}` : `https://wa.me/?text=${encodeURIComponent(textoConfirmacao)}`
      });

      setItemSelecionadoSaida(null);
      setRecebedorNome(''); setRecebedorDoc(''); setFotoSaidaUrl('');
      carregarDados();
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída da custódia realizada com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const itensFiltradosSaida = itensGuardados.filter(item => {
    const termo = buscaTermo.toLowerCase();
    const cod = item.codigo_custodia?.toLowerCase() || '';
    const desc = item.descricao?.toLowerCase() || '';
    const dest = item.destino_nome_doc?.toLowerCase() || '';
    const orig = item.origem_nome_doc?.toLowerCase() || '';
    const unid = item.destino_unidade?.toLowerCase() || '';
    return cod.includes(termo) || desc.includes(termo) || dest.includes(termo) || orig.includes(termo) || unid.includes(termo);
  });

  return (
    <div className="space-y-6">
      {/* Navegação entre Guarda e Devolução */}
      <div className="grid grid-cols-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setAba('entrada')}
          className={`p-4 text-left border-b-4 transition ${aba === 'entrada' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">Fluxo 1</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><PackagePlus className="w-4 h-4 text-emerald-600" /> Receber e Guardar Item</strong>
        </button>

        <button
          onClick={() => setAba('saida')}
          className={`p-4 text-left border-b-4 transition ${aba === 'saida' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">Fluxo 2</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><PackageCheck className="w-4 h-4 text-blue-600" /> Baixa / Devolução ({itensGuardados.length})</strong>
        </button>
      </div>

      {/* Alertas Globais */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: RECEBER E GUARDAR ITEM */}
      {/* ========================================================================= */}
      {aba === 'entrada' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-slate-800" /> Custódia de Itens na Portaria
            </h3>
            <p className="text-xs text-slate-500">
              Registre o objeto deixado na guarita identificando quem entregou e quem está autorizado a retirar.
            </p>
          </div>

          <form onSubmit={salvarEntradaCustodia} className="space-y-6 max-w-4xl">
            {/* SELEÇÃO DO FLUXO DE GUARDA */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Selecione o Fluxo de Custódia *</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFluxo('M-M')}
                  className={`p-3 rounded-xl border text-center transition ${fluxo === 'M-M' ? 'bg-slate-900 text-white font-bold border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs">Morador ➔ Morador</p>
                  <span className="text-[10px] opacity-75">Chaves, documentos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFluxo('M-T')}
                  className={`p-3 rounded-xl border text-center transition ${fluxo === 'M-T' ? 'bg-slate-900 text-white font-bold border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs">Morador ➔ Terceiro</p>
                  <span className="text-[10px] opacity-75">Para prestador / visita</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFluxo('T-M')}
                  className={`p-3 rounded-xl border text-center transition ${fluxo === 'T-M' ? 'bg-slate-900 text-white font-bold border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs">Terceiro ➔ Morador</p>
                  <span className="text-[10px] opacity-75">Farmácia / lavanderia</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              {/* QUEM DEIXOU (ORIGEM) */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-700 border-b pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" /> Origem (Quem Deixou o Objeto)
                </h4>

                {fluxo.startsWith('M') ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Unidade / AP *</label>
                        <input
                          type="text"
                          required
                          value={origemUnidade}
                          onChange={(e) => selecionarOrigemMorador(e.target.value, origemBloco)}
                          placeholder="Ex: 24"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Bloco</label>
                        <input
                          type="text"
                          value={origemBloco}
                          onChange={(e) => { setOrigemBloco(e.target.value); selecionarOrigemMorador(origemUnidade, e.target.value); }}
                          placeholder="Ex: A"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Nome do Morador *</label>
                      <input
                        type="text"
                        required
                        value={origemNome}
                        onChange={(e) => setOrigemNome(e.target.value)}
                        placeholder="Nome do morador"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Nome / Empresa do Terceiro *</label>
                    <input
                      type="text"
                      required
                      value={origemNome}
                      onChange={(e) => setOrigemNome(e.target.value)}
                      placeholder="Ex: Farmácia Drogasil / Entregador João"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">WhatsApp para Contato</label>
                  <input
                    type="text"
                    value={origemWhats}
                    onChange={(e) => setOrigemWhats(e.target.value)}
                    placeholder="Ex: 11940609960"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* QUEM RETIRA (DESTINO) */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-700 border-b pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> Destino (Quem Vai Retirar)
                </h4>

                {fluxo.endsWith('M') ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Unidade / AP *</label>
                        <input
                          type="text"
                          required
                          value={destinoUnidade}
                          onChange={(e) => selecionarDestinoMorador(e.target.value, destinoBloco)}
                          placeholder="Ex: 24"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Bloco</label>
                        <input
                          type="text"
                          value={destinoBloco}
                          onChange={(e) => { setDestinoBloco(e.target.value); selecionarDestinoMorador(destinoUnidade, e.target.value); }}
                          placeholder="Ex: A"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Nome do Morador Destinatário *</label>
                      <input
                        type="text"
                        required
                        value={destinoNome}
                        onChange={(e) => setDestinoNome(e.target.value)}
                        placeholder="Nome do destinatário"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Nome / Documento do Terceiro *</label>
                    <input
                      type="text"
                      required
                      value={destinoNome}
                      onChange={(e) => setDestinoNome(e.target.value)}
                      placeholder="Ex: Técnico Enel / Maria da Limpeza"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">WhatsApp para Notificação</label>
                  <input
                    type="text"
                    value={destinoWhats}
                    onChange={(e) => setDestinoWhats(e.target.value)}
                    placeholder="Ex: 11940609960"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* DETALHES DO OBJETO E CAPTURA DE FOTO */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição do Objeto em Custódia *</label>
                <input
                  type="text"
                  required
                  value={descricaoItem}
                  onChange={(e) => setDescricaoItem(e.target.value)}
                  placeholder="Ex: Molho de chaves do portão social, envelope pardo, capacete preto..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto Obrigatória do Objeto Retido *</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs shadow-sm">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  {uploadingFoto ? 'Processando foto...' : '📷 Tirar Foto do Objeto Guardado'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFotoStorage(e.target.files[0], 'custodia_entrada', setFotoEntradaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoEntradaUrl && (
                  <div className="mt-2 relative w-28 h-28 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-sm">
                    <img src={fotoEntradaUrl} alt="Objeto Guardado" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingFoto}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-md uppercase text-sm"
            >
              Confirmar Entrada e Returar Objeto
            </button>
          </form>

          {/* WhatsApp Notificação de Entrada */}
          {whatsEntradaLink && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-4xl">
              <p className="text-xs font-bold text-emerald-900">
                Custódia {whatsEntradaLink.codigo} registrada! Notifique o destinatário no WhatsApp:
              </p>
              <a
                href={whatsEntradaLink.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Notificação de Guarda no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: BAIXA / DEVOLUÇÃO DE CUSTÓDIA */}
      {/* ========================================================================= */}
      {aba === 'saida' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <PackageCheck className="w-6 h-6 text-blue-600" /> Devolução de Objeto em Custódia
            </h3>
            <p className="text-xs text-slate-500">
              Localize o item na portaria e registre a retirada colhendo a foto e nome de quem recebeu.
            </p>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative max-w-xl">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              placeholder="Buscar por código, unidade, nome do morador ou descrição..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Listagem de Itens Guardados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itensFiltradosSaida.map((item) => (
              <div
                key={item.id}
                onClick={() => setItemSelecionadoSaida(item)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-3 ${
                  itemSelecionadoSaida?.id === item.id 
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold font-mono bg-slate-900 text-white px-2 py-0.5 rounded">
                      {item.codigo_custodia}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 mt-1">{item.descricao}</h4>
                  </div>
                  {item.foto_entrada_url && (
                    <img src={item.foto_entrada_url} alt="Objeto" className="w-12 h-12 rounded-lg object-cover border" />
                  )}
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                  <p className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">De:</span> {item.origem_nome_doc} {item.origem_unidade ? `(Apt ${item.origem_unidade})` : ''}
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">Para:</span> {item.destino_nome_doc} {item.destino_unidade ? `(Apt ${item.destino_unidade})` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Entrou em: {new Date(item.data_hora_entrada).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}

            {itensFiltradosSaida.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-500 text-xs italic">
                Nenhum objeto aguardando retirada no momento.
              </div>
            )}
          </div>

          {/* FORMULÁRIO DE RETIRADA */}
          {itemSelecionadoSaida && (
            <form onSubmit={efetivarSaidaCustodia} className="p-5 bg-slate-900 text-white rounded-2xl space-y-4 max-w-2xl animate-in fade-in">
              <h4 className="font-bold text-sm border-b border-slate-700 pb-2 text-emerald-400">
                Registrar Retirada — {itemSelecionadoSaida.codigo_custodia} ({itemSelecionadoSaida.descricao})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-slate-300">Nome de Quem Retirou *</label>
                  <input
                    type="text"
                    required
                    value={recebedorNome}
                    onChange={(e) => setRecebedorNome(e.target.value)}
                    placeholder="Ex: Maria (Própria Moradora)"
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-slate-300">Documento / RG (Opcional)</label>
                  <input
                    type="text"
                    value={recebedorDoc}
                    onChange={(e) => setRecebedorDoc(e.target.value)}
                    placeholder="Ex: 12.345.678-9"
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-300">Foto do Retirante com o Objeto *</label>
                <label className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs shadow-sm">
                  <Camera className="w-5 h-5" />
                  {uploadingFoto ? 'Salvando comprovante...' : '📷 Tirar Foto da Devolução / Retirante'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFotoStorage(e.target.files[0], 'custodia_saida', setFotoSaidaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoSaidaUrl && (
                  <div className="mt-2 relative w-28 h-28 rounded-lg overflow-hidden border-2 border-emerald-400 shadow-sm">
                    <img src={fotoSaidaUrl} alt="Foto Retirada" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-4 rounded-xl transition shadow-md uppercase text-xs"
              >
                Efetivar Baixa de Devolução
              </button>
            </form>
          )}

          {/* WhatsApp Notificação de Saída */}
          {whatsSaidaLink && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-2xl">
              <p className="text-xs font-bold text-emerald-900">
                Devolução concluída! Notifique quem deixou o objeto sobre a entrega:
              </p>
              <a
                href={whatsSaidaLink.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Confirmação no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
