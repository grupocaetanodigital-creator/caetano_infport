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
  User 
} from 'lucide-react';

interface CustodiaProps {
  usuarioLogado?: any;
}

export default function Custodia({ usuarioLogado }: CustodiaProps) {
  const [aba, setAba] = useState<'entrada' | 'saida'>('entrada');
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [moradores, setMoradores] = useState<any[]>([]);
  const [itensGuardados, setItensGuardados] = useState<any[]>([]);

  const [fluxo, setFluxo] = useState('M-M');
  
  const [origemUnidade, setOrigemUnidade] = useState('');
  const [origemBloco, setOrigemBloco] = useState('');
  const [origemNome, setOrigemNome] = useState('');
  const [origemWhats, setOrigemWhats] = useState('');

  const [destinoUnidade, setDestinoUnidade] = useState('');
  const [destinoBloco, setDestinoBloco] = useState('');
  const [destinoNome, setDestinoNome] = useState('');
  const [destinoWhats, setDestinoWhats] = useState('');

  const [descricaoItem, setDescricaoItem] = useState('');
  const [fotoEntradaUrl, setFotoEntradaUrl] = useState('');
  const [whatsEntradaLink, setWhatsEntradaLink] = useState<any | null>(null);

  const [buscaTermo, setBuscaTermo] = useState('');
  const [itemSelecionadoSaida, setItemSelecionadoSaida] = useState<any | null>(null);
  const [recebedorNome, setRecebedorNome] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [fotoSaidaUrl, setFotoSaidaUrl] = useState('');
  const [whatsSaidaLink, setWhatsSaidaLink] = useState<any | null>(null);

  useEffect(() => {
    carregarDados();
  }, [aba, usuarioLogado?.condominio_id]);

  const carregarDados = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data: moradData } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setMoradores(moradData || []);

      const { data: custodiaData } = await supabase
        .from('custodia')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'Aguardando Retirada')
        .order('created_at', { ascending: false });
      setItensGuardados(custodiaData || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadFotoStorage = async (file: File | null, pasta: string, setUrlCallback: (url: string) => void) => {
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
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const selecionarOrigemMorador = (unid: string, bloc: string) => {
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

  const selecionarDestinoMorador = (unid: string, bloc: string) => {
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

  const blocosDisponiveis = Array.from(new Set(moradores.map((m: any) => m.bloco?.trim()).filter(Boolean))).sort() as string[];
  const listaBlocos = blocosDisponiveis.length > 0 ? blocosDisponiveis : ['A', 'B', 'C', 'D'];

  const moradoresOrigemFiltrados = moradores.filter(
    (m) => origemUnidade && m.unidade && String(m.unidade) === String(origemUnidade) && (!origemBloco || m.bloco === origemBloco)
  );
  const moradoresDestinoFiltrados = moradores.filter(
    (m) => destinoUnidade && m.unidade && String(m.unidade) === String(destinoUnidade) && (!destinoBloco || m.bloco === destinoBloco)
  );

  const salvarEntradaCustodia = async (e: React.FormEvent) => {
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

      const { error } = await supabase
        .from('custodia')
        .insert([novoRegistro]);

      if (error) throw error;

      const telDestino = destinoWhats.replace(/\D/g, '');
      const textoWhats = `🔑 *ITEM EM CUSTÓDIA NA PORTARIA*\nCódigo: ${codigoCustodia}\nDe: ${origemNome} (${origemUnidade ? 'Apt ' + origemUnidade : 'Terceiro'})\nPara: ${destinoNome}\nDescrição: ${descricaoItem}\nFoto do Objeto: ${fotoEntradaUrl}\n\nPor favor, retire na guarita informando o código!`;

      setWhatsEntradaLink({
        codigo: codigoCustodia,
        link: telDestino ? `https://wa.me/55${telDestino}?text=${encodeURIComponent(textoWhats)}` : `https://wa.me/?text=${encodeURIComponent(textoWhats)}`
      });

      setOrigemUnidade(''); setOrigemBloco(''); setOrigemNome(''); setOrigemWhats('');
      setDestinoUnidade(''); setDestinoBloco(''); setDestinoNome(''); setDestinoWhats('');
      setDescricaoItem(''); setFotoEntradaUrl('');
      carregarDados();
      setMensagem({ tipo: 'sucesso', texto: `Item guardado com sucesso! Código: ${codigoCustodia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarSaidaCustodia = async (e: React.FormEvent) => {
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

      const telOrigem = itemSelecionadoSaida.origem_whats?.replace(/\D/g, '') || '';
      const textoConfirmacao = `✅ *ITEM ENTREGUE COM SUCESSO*\nCódigo: ${itemSelecionadoSaida.codigo_custodia}\nObjeto: ${itemSelecionadoSaida.descricao}\nRetirado Por: ${recebedorNome}\nComprovante: ${fotoSaidaUrl}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setWhatsSaidaLink({
        link: telOrigem ? `https://wa.me/55${telOrigem}?text=${encodeURIComponent(textoConfirmacao)}` : `https://wa.me/?text=${encodeURIComponent(textoConfirmacao)}`
      });

      setItemSelecionadoSaida(null);
      setRecebedorNome(''); setRecebedorDoc(''); setFotoSaidaUrl('');
      carregarDados();
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída da custódia realizada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const itensFiltradosSaida = itensGuardados.filter((item: any) => {
    const termo = buscaTermo.toLowerCase();
    const cod = item.codigo_custodia?.toLowerCase() || '';
    const desc = item.descricao?.toLowerCase() || '';
    const dest = item.destino_nome_doc?.toLowerCase() || '';
    const orig = item.origem_nome_doc?.toLowerCase() || '';
    const unid = item.destino_unidade?.toLowerCase() || '';
    return cod.includes(termo) || desc.includes(termo) || dest.includes(termo) || orig.includes(termo) || unid.includes(termo);
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <button
          onClick={() => setAba('entrada')}
          className={`p-2.5 text-left border-b-2 transition cursor-pointer ${aba === 'entrada' ? 'border-emerald-600 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Fluxo 1</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center gap-1.5"><PackagePlus className="w-3.5 h-3.5 text-emerald-600" /> Receber e Guardar</strong>
        </button>

        <button
          onClick={() => setAba('saida')}
          className={`p-2.5 text-left border-b-2 transition cursor-pointer ${aba === 'saida' ? 'border-emerald-600 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Fluxo 2</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center gap-1.5"><PackageCheck className="w-3.5 h-3.5 text-blue-600" /> Baixa / Devolução ({itensGuardados.length})</strong>
        </button>
      </div>

      {mensagem.texto && (
        <div className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      {aba === 'entrada' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="border-b pb-2">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Custódia de Itens na Portaria
            </h3>
            <p className="text-[11px] text-slate-500">
              Registre o objeto deixado na guarita identificando quem entregou e quem está autorizado a retirar.
            </p>
          </div>

          <form onSubmit={salvarEntradaCustodia} className="space-y-3 max-w-4xl">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Selecione o Fluxo de Custódia *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFluxo('M-M')}
                  className={`p-2 rounded-lg border text-center transition cursor-pointer ${fluxo === 'M-M' ? 'bg-slate-900 text-white font-bold border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs">Morador ➔ Morador</p>
                  <span className="text-[9px] opacity-75">Chaves, documentos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFluxo('M-T')}
                  className={`p-2 rounded-lg border text-center transition cursor-pointer ${fluxo === 'M-T' ? 'bg-slate-900 text-white font-bold border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs">Morador ➔ Terceiro</p>
                  <span className="text-[9px] opacity-75">Para prestador / visita</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFluxo('T-M')}
                  className={`p-2 rounded-lg border text-center transition cursor-pointer ${fluxo === 'T-M' ? 'bg-slate-900 text-white font-bold border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs">Terceiro ➔ Morador</p>
                  <span className="text-[9px] opacity-75">Farmácia / lavanderia</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <h4 className="font-bold text-[11px] uppercase text-slate-700 border-b pb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" /> Origem (Quem Deixou o Objeto)
                </h4>

                {fluxo.startsWith('M') ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">Unidade / AP *</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={origemUnidade}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '');
                            selecionarOrigemMorador(v, origemBloco);
                          }}
                          placeholder="Ex: 24"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">Bloco</label>
                        <select
                          value={origemBloco}
                          onChange={(e) => {
                            setOrigemBloco(e.target.value);
                            selecionarOrigemMorador(origemUnidade, e.target.value);
                          }}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        >
                          <option value="">Todos / Sem Bloco</option>
                          {listaBlocos.map((b) => (
                            <option key={b} value={b}>Bloco {b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {moradoresOrigemFiltrados.length > 0 && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-emerald-800 uppercase">
                          Moradores do Ap {origemUnidade}:
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {moradoresOrigemFiltrados.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setOrigemNome(m.nome);
                                if (m.telefone) setOrigemWhats(m.telefone);
                              }}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              👤 {m.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Nome do Morador *</label>
                      <input
                        type="text"
                        required
                        value={origemNome}
                        onChange={(e) => setOrigemNome(e.target.value)}
                        placeholder="Nome do morador"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Nome / Empresa do Terceiro *</label>
                    <input
                      type="text"
                      required
                      value={origemNome}
                      onChange={(e) => setOrigemNome(e.target.value)}
                      placeholder="Ex: Farmácia Drogasil / Entregador João"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
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
                          inputMode="numeric"
                          required
                          value={destinoUnidade}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '');
                            selecionarDestinoMorador(v, destinoBloco);
                          }}
                          placeholder="Ex: 24"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Bloco</label>
                        <select
                          value={destinoBloco}
                          onChange={(e) => {
                            setDestinoBloco(e.target.value);
                            selecionarDestinoMorador(destinoUnidade, e.target.value);
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        >
                          <option value="">Todos / Sem Bloco</option>
                          {listaBlocos.map((b) => (
                            <option key={b} value={b}>Bloco {b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {moradoresDestinoFiltrados.length > 0 && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase">
                          Moradores do Ap {destinoUnidade}:
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {moradoresDestinoFiltrados.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setDestinoNome(m.nome);
                                if (m.telefone) setDestinoWhats(m.telefone);
                              }}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              👤 {m.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

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
                    onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'custodia_entrada', setFotoEntradaUrl)}
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
              Confirmar Entrada e Guardar Objeto
            </button>
          </form>

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

      {aba === 'saida' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="border-b pb-2">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-blue-600" /> Devolução de Objeto em Custódia
            </h3>
            <p className="text-[11px] text-slate-500">
              Localize o item na portaria e registre a retirada colhendo a foto e nome de quem recebeu.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              placeholder="Buscar por código, unidade, nome do morador ou descrição..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {itensFiltradosSaida.map((item: any) => (
              <div
                key={item.id}
                onClick={() => setItemSelecionadoSaida(item)}
                className={`p-2.5 rounded-lg border cursor-pointer transition space-y-2 ${
                  itemSelecionadoSaida?.id === item.id 
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold font-mono bg-slate-900 text-white px-1.5 py-0.2 rounded">
                      {item.codigo_custodia}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-0.5">{item.descricao}</h4>
                  </div>
                  {item.foto_entrada_url && (
                    <img src={item.foto_entrada_url} alt="Objeto" className="w-10 h-10 rounded-md object-cover border shrink-0" />
                  )}
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 bg-white p-2 rounded-md border border-slate-200">
                  <p className="truncate">
                    <span className="font-bold text-slate-800">De:</span> {item.origem_nome_doc} {item.origem_unidade ? `(Ap ${item.origem_unidade})` : ''}
                  </p>
                  <p className="truncate">
                    <span className="font-bold text-slate-800">Para:</span> {item.destino_nome_doc} {item.destino_unidade ? `(Ap ${item.destino_unidade})` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5" /> {new Date(item.data_hora_entrada || item.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}

            {itensFiltradosSaida.length === 0 && (
              <div className="col-span-full text-center py-6 text-slate-500 text-xs italic">
                Nenhum objeto aguardando retirada no momento.
              </div>
            )}
          </div>

          {itemSelecionadoSaida && (
            <form onSubmit={efetivarSaidaCustodia} className="p-3 sm:p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5 max-w-2xl shadow-2xs animate-in fade-in border border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-emerald-400 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-400" />
                  Retirada: {itemSelecionadoSaida.codigo_custodia} ({itemSelecionadoSaida.descricao})
                </h4>
                <button
                  type="button"
                  onClick={() => setItemSelecionadoSaida(null)}
                  className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-0.5 text-slate-300">Nome de Quem Retirou *</label>
                  <input
                    type="text"
                    required
                    value={recebedorNome}
                    onChange={(e) => setRecebedorNome(e.target.value)}
                    placeholder="Ex: Maria (Própria Moradora)"
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-medium focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-0.5 text-slate-300">Documento / RG (Opcional)</label>
                  <input
                    type="text"
                    value={recebedorDoc}
                    onChange={(e) => setRecebedorDoc(e.target.value)}
                    placeholder="Ex: 12.345.678-9"
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-300">Foto do Retirante com o Objeto *</label>
                <label className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition text-xs border border-slate-700 shadow-2xs">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{uploadingFoto ? 'Salvando comprovante...' : '📷 Tirar Foto da Devolução / Retirante'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'custodia_saida', setFotoSaidaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoSaidaUrl && (
                  <div className="mt-1 relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-400 shadow-2xs">
                    <img src={fotoSaidaUrl} alt="Foto Retirada" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition shadow-2xs uppercase text-xs cursor-pointer"
              >
                Efetivar Baixa de Devolução
              </button>
            </form>
          )}

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
                <MessageCircle className="w-4 h-4" /> Enviar Confirmação de Entrega no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
