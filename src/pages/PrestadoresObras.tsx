import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Briefcase, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search, 
  LogIn, 
  LogOut, 
  Camera, 
  Building2, 
  Scan, 
  Loader2 
} from 'lucide-react';

interface PrestadoresObrasProps {
  usuarioLogado?: any;
}

export default function PrestadoresObras({ usuarioLogado }: PrestadoresObrasProps) {
  const [prestadores, setPrestadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processandoOcr, setProcessandoOcr] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [busca, setBusca] = useState('');

  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalAcesso, setModalAcesso] = useState(false);
  const [prestadorSelecionado, setPrestadorSelecionado] = useState<any | null>(null);

  const [nomeProfissional, setNomeProfissional] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [documento, setDocumento] = useState('');
  const [tipoServico, setTipoServico] = useState('Manutenção / Reforma');
  const [atendeCondominio, setAtendeCondominio] = useState(false);
  const [unidadeDestino, setUnidadeDestino] = useState('');
  const [blocoDestino, setBlocoDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [cracha, setCracha] = useState('');

  useEffect(() => {
    carregarPrestadores();
  }, [usuarioLogado?.condominio_id]);

  const carregarPrestadores = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('prestadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrestadores(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar prestadores: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const processarImagemCanvas = (fileSource: File, angulo = 0): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        
        if (angulo === 90 || angulo === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angulo * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = URL.createObjectURL(fileSource);
    });
  };

  const processarDocumentoOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setProcessandoOcr(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      if (!(window as any).Tesseract) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Erro ao carregar a biblioteca Tesseract.js.'));
          document.head.appendChild(script);
        });
      }

      const angulosTeste = [0, 90, 270];
      let textoLidoMelhor = '';
      let cpfEncontrado: string | null = null;
      let rgEncontrado: string | null = null;

      for (const angulo of angulosTeste) {
        const imgData = await processarImagemCanvas(file, angulo);
        if (!imgData) continue;
        const ret = await (window as any).Tesseract.recognize(imgData, 'por');
        const txt = ret?.data?.text || '';

        const cpfMatch = txt.match(/\d{3}[\s.]?\d{3}[\s.]?\d{3}[\s.-]?\d{2}/) || txt.match(/\d{11}/);
        const rgMatch = txt.match(/\d{1,2}[\s.]?\d{3}[\s.]?\d{3}[\s.-]?[\dX|x]/i);

        if (cpfMatch || rgMatch) {
          textoLidoMelhor = txt;
          if (cpfMatch) cpfEncontrado = cpfMatch[0].replace(/[^\d]/g, '');
          if (rgMatch) rgEncontrado = rgMatch[0].replace(/\s/g, '');
          break;
        }

        if (!textoLidoMelhor) {
          textoLidoMelhor = txt;
        }
      }

      let docFinal = '';
      if (cpfEncontrado && cpfEncontrado.length === 11) {
        docFinal = cpfEncontrado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        setDocumento(docFinal);
      } else if (rgEncontrado) {
        docFinal = rgEncontrado;
        setDocumento(rgEncontrado);
      }

      const palavrasIgnoradas = [
        'REPUBLICA', 'FEDERATIVA', 'BRASIL', 'CARTEIRA', 'HABILITACAO', 'IDENTIDADE',
        'REGISTRO', 'GERAL', 'MINISTERIO', 'FAZENDA', 'RECEITA', 'FEDERAL',
        'VALIDA', 'TERRITORIO', 'NACIONAL', 'CPF', 'NOME', 'SOBRENOME', 'DRIVER',
        'LICENSE', 'PERMISO', 'CONDUCCION', 'SECRETARIA', 'INFRAESTRUTURA', 'TRANSITO',
        'FILIACAO', 'NACIONALIDADE', 'BRASILEIRO', 'ASSINATURA', 'PORTADOR', 'EMISSAO', 'DOC'
      ];

      const linhas = textoLidoMelhor.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      const linhaNome = linhas.find(linha => {
        const linhaUpper = linha.toUpperCase();
        const temNumero = /\d/.test(linha);
        const ehIgnorada = palavrasIgnoradas.some(p => linhaUpper.includes(p));
        return !temNumero && !ehIgnorada && linha.length >= 6;
      });

      if (linhaNome) {
        const nomeFormatado = linhaNome.replace(/[^a-zA-LÁ-ÿ\s]/g, '').replace(/\s+/g, ' ').trim();
        if (nomeFormatado.length >= 5) {
          setNomeProfissional(nomeFormatado);
        }
      }

      if (docFinal || linhaNome) {
        setMensagem({ tipo: 'sucesso', texto: 'OCR concluído com sucesso! Confira os dados e clique em "Salvar Cadastro".' });
      } else {
        setMensagem({ tipo: 'erro', texto: 'Não foi possível identificar dados legíveis no documento. Tente tirar uma foto mais nítida ou preencha manualmente.' });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Falha na leitura do documento: ' + err.message });
    } finally {
      setProcessandoOcr(false);
      e.target.value = '';
    }
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const novoRegistro = {
        condominio_id: usuarioLogado.condominio_id,
        nome_profissional: nomeProfissional.trim(),
        empresa: empresa.trim(),
        documento: documento.trim(),
        tipo_servico: tipoServico,
        atende_condominio: atendeCondominio,
        unidade: atendeCondominio ? 'Condomínio' : unidadeDestino.trim(),
        bloco: atendeCondominio ? 'Área Comum' : blocoDestino.trim(),
        observacoes: observacoes.trim(),
        status_acesso: 'AUTORIZADO'
      };

      const { error } = await supabase
        .from('prestadores')
        .insert([novoRegistro]);

      if (error) throw error;

      setModalCadastro(false);
      setNomeProfissional('');
      setEmpresa('');
      setDocumento('');
      setUnidadeDestino('');
      setBlocoDestino('');
      setAtendeCondominio(false);
      setObservacoes('');
      await carregarPrestadores();
      setMensagem({ tipo: 'sucesso', texto: 'Prestador / Obra cadastrado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao cadastrar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const registrarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestadorSelecionado) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('prestadores')
        .update({
          status_acesso: 'EM_ANDAMENTO',
          data_hora_entrada: new Date().toISOString(),
          cracha_atribuido: cracha.trim() || 'Crachá Portaria'
        })
        .eq('id', prestadorSelecionado.id);

      if (error) throw error;

      setModalAcesso(false);
      setPrestadorSelecionado(null);
      setCracha('');
      await carregarPrestadores();
      setMensagem({ tipo: 'sucesso', texto: 'Entrada registrada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar entrada: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const registrarSaida = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('prestadores')
        .update({
          status_acesso: 'CONCLUIDO',
          data_hora_saida: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await carregarPrestadores();
      setMensagem({ tipo: 'sucesso', texto: 'Saída registrada e crachá devolvido!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar saída: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const prestadoresFiltrados = prestadores.filter((p: any) => 
    p.nome_profissional?.toLowerCase().includes(busca.toLowerCase()) ||
    p.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
    p.unidade?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <Briefcase className="w-3.5 h-3.5" /> Módulo 10 - Obras e Prestadores
          </span>
          <h3 className="font-bold text-lg mt-1">Controle de Prestadores de Serviço e Obras</h3>
          <p className="text-xs text-slate-300">Acesso agilizado com OCR de documentos e registro de visitas ao Condomínio.</p>
        </div>

        <button
          onClick={() => setModalCadastro(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase shadow-md"
        >
          <Plus className="w-4 h-4" /> Novo Prestador / Obra
        </button>
      </div>

      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome, empresa, unidade ou condomínio..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs shadow-sm font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prestadoresFiltrados.map((item: any) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold text-slate-900 uppercase">
                  {item.empresa || 'Autônomo'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  item.status_acesso === 'EM_ANDAMENTO' ? 'bg-amber-100 text-amber-800' :
                  item.status_acesso === 'CONCLUIDO' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {item.status_acesso || 'AUTORIZADO'}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">{item.nome_profissional}</h4>
                <p className="text-xs text-slate-500">Doc: {item.documento || 'Não informado'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Serviço:</span>
                  <strong className="text-slate-800">{item.tipo_servico}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Destino:</span>
                  {item.atende_condominio ? (
                    <strong className="text-purple-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Condomínio
                    </strong>
                  ) : (
                    <strong className="text-emerald-700">Bloco {item.bloco} - Apto {item.unidade}</strong>
                  )}
                </div>
              </div>

              {item.observacoes && (
                <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
                  "{item.observacoes}"
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(item.created_at).toLocaleDateString('pt-BR')}
              </span>

              {item.status_acesso === 'EM_ANDAMENTO' ? (
                <button
                  onClick={() => registrarSaida(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1 transition shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" /> Registrar Saída
                </button>
              ) : item.status_acesso === 'CONCLUIDO' ? (
                <span className="text-xs text-slate-400 font-medium italic">Acesso finalizado</span>
              ) : (
                <button
                  onClick={() => { setPrestadorSelecionado(item); setModalAcesso(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1 transition shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" /> Liberar Entrada
                </button>
              )}
            </div>
          </div>
        ))}

        {prestadoresFiltrados.length === 0 && !loading && (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 italic text-xs">
            Nenhum prestador ou obra cadastrado até o momento.
          </div>
        )}
      </div>

      {modalCadastro && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalCadastro(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" /> Cadastrar Prestador / Obra
            </h3>

            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                  <Scan className="w-4 h-4" /> Leitura OCR de Documento (RG/CPF/CNH)
                </span>
                {processandoOcr && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-300">
                Tire foto do documento para preencher o nome e número automaticamente (mesmo se a foto estiver na vertical).
              </p>

              <label className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition w-full">
                <Camera className="w-4 h-4" /> Carregar Foto do Documento
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={processarDocumentoOCR}
                  className="hidden"
                />
              </label>
            </div>

            <form onSubmit={handleCadastrar} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo do Profissional *</label>
                <input
                  type="text"
                  required
                  value={nomeProfissional}
                  onChange={(e) => setNomeProfissional(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Empresa / Prestadora</label>
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Ex: ClimaTech Ar Condicionado"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CPF / RG *</label>
                  <input
                    type="text"
                    required
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-950 block">Serviço Prestado ao Condomínio?</span>
                  <span className="text-[10px] text-purple-700">Manutenção predial, elevadores, jardinagem, etc.</span>
                </div>
                <input
                  type="checkbox"
                  checked={atendeCondominio}
                  onChange={(e) => setAtendeCondominio(e.target.checked)}
                  className="w-5 h-5 rounded accent-purple-600 cursor-pointer"
                />
              </div>

              {!atendeCondominio && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco *</label>
                    <input
                      type="text"
                      required={!atendeCondominio}
                      value={blocoDestino}
                      onChange={(e) => setBlocoDestino(e.target.value)}
                      placeholder="Ex: A"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / Apto *</label>
                    <input
                      type="text"
                      required={!atendeCondominio}
                      value={unidadeDestino}
                      onChange={(e) => setUnidadeDestino(e.target.value)}
                      placeholder="Ex: 102"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Serviço</label>
                <select
                  value={tipoServico}
                  onChange={(e) => setTipoServico(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="Manutenção / Reforma">Manutenção / Reforma</option>
                  <option value="Serviço Predial Condomínio">Serviço Predial Condomínio</option>
                  <option value="Entrega de Móveis">Entrega de Móveis</option>
                  <option value="Assistência Técnica">Assistência Técnica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações / Horários</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Instruções específicas para a guarita..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCadastro(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase shadow-sm"
                >
                  {loading ? 'Salvando...' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAcesso && prestadorSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalAcesso(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-emerald-600" /> Liberar Entrada na Portaria
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <p><strong>Profissional:</strong> {prestadorSelecionado.nome_profissional}</p>
              <p><strong>Empresa:</strong> {prestadorSelecionado.empresa || 'Autônomo'}</p>
              <p><strong>Destino:</strong> {prestadorSelecionado.atende_condominio ? 'Condomínio (Área Comum)' : `Bloco ${prestadorSelecionado.bloco} - Apto ${prestadorSelecionado.unidade}`}</p>
            </div>

            <form onSubmit={registrarEntrada} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Crachá Atribuído</label>
                <input
                  type="text"
                  required
                  value={cracha}
                  onChange={(e) => setCracha(e.target.value)}
                  placeholder="Ex: Crachá Nº 12"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAcesso(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase shadow-sm"
                >
                  {loading ? 'Registrando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
