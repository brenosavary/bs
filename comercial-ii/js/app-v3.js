// ============================================================================
// PAINEL COMERCIAL II - JavaScript Puro
// ============================================================================

Highcharts.setOptions({
    lang: {
        months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        shortMonths: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
        loading: 'Carregando...',
        contextButtonTitle: 'Menu de contexto de exportação',
        printChart: 'Imprimir gráfico',
        downloadJPEG: 'Baixar imagem JPEG',
        downloadPDF: 'Baixar documento PDF',
        downloadPNG: 'Baixar imagem PNG',
        downloadSVG: 'Baixar imagem vetorial SVG',
        downloadCSV: 'Baixar CSV',
        downloadXLS: 'Baixar XLS',
        viewData: 'Ver tabela de dados',
        viewFullscreen: 'Ver em tela cheia',
        resetZoom: 'Redefinir zoom',
        resetZoomTitle: 'Redefinir zoom para o nível 1:1',
        decimalPoint: ',',
        numericSymbols: [' mil', ' milhões'],
        thousandsSep: '.',
        accessibility: {
            defaultTooltip: 'Vá para o gráfico {series.name}',
            chartContainerLabel: 'Gráfico interativo',
            chartHeading: 'Gráfico mostrando dados',
            screenReaderSection: {
                beforeRegionLabel: 'Informações do gráfico',
                afterRegionLabel: 'Fim do gráfico interativo'
            }
        }
    }
});

// Estado Global
const state = {
    vendas: [],
    configuracao: {
        POR_EMPRESA: 'S',
        POR_CIDADE: 'S',
        POR_ROTA: 'S',
        POR_ESTADO: 'S',
        POR_VENDEDOR: 'S',
        POR_GRUPO: 'S',
        POR_MARCA: 'S',
        POR_REGIAO: 'S',
        POR_TIPO_PAGAMENTO: 'S',
        POR_TIPO_DOCUMENTO: 'S',
        POR_STATUS_DOCUMENTO: 'S',
        DATA_INI: '2024-01-01 00:00:00.0',
        DATA_FIN: '2025-12-31 00:00:00.0',
        PED_OU_NF: 'P',
        PED_OU_PED_E_OS: 'PP'
    },
    filtros: {
        dataInicio: '2024-01-01',
        dataFim: '2025-12-31',
        empresa: [],
        marca: [],
        vendedor: [],
        grupo: [],
        cliente: [],
        regiao: [],
        cidade: [],
        rota: [],
        estado: [],
        tipo_pagamento: [],
        tipo_documento: [],
        status_documento: []
    },
    filtrosColuna: {
        data: '',
        empresa: '',
        marca: '',
        vendedor: '',
        grupo: '',
        cliente: '',
        regiao: '',
        cidade: '',
        rota: '',
        estado: '',
        tipo_pagamento: '',
        tipo_documento: '',
        status_documento: ''
    },
    agrupamentos: {
        periodo: 'mes',
        tipoGrafico: 'barras',
        visualizacao: 'totalizado'
    },
    opcoes: {
        empresas: [],
        marcas: [],
        vendedores: [],
        grupos: [],
        clientes: [],
        regioes: [],
        cidades: [],
        rotas: [],
        estados: [],
        tipos_pagamento: [],
        tipos_documento: [],
        status_documento: []
    },
    modalCliente: {
        valorMinimo: 0,
        cliente: null,
        dimensao: null
    },
    detalhesProjecao: {
        valorTotal: 0,
        diasPassados: 0,
        diasFaltantes: 0,
        mediaDia: 0,
        resultado: 0
    },
    numPedidos: 0
};

// ============================================================================
// DATAS (evita bug de timezone com "YYYY-MM-DD")
// ============================================================================

function extrairDataISO(valor) {
    if (!valor) return null;
    const texto = String(valor).trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

function parseDataLocal(valor, { endOfDay = false } = {}) {
    const iso = extrairDataISO(valor);
    if (!iso) return null;
    const [ano, mes, dia] = iso.split('-').map(Number);
    return endOfDay
        ? new Date(ano, mes - 1, dia, 23, 59, 59, 999)
        : new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

function formatarDataPtBR(valor) {
    const data = parseDataLocal(valor);
    return data ? data.toLocaleDateString('pt-BR') : '';
}

function extrairMesISO(valor) {
    const iso = extrairDataISO(valor);
    return iso ? iso.slice(0, 7) : '';
}

function ultimoDiaDoMesISO(ano, mes) {
    return String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
}

function normalizarDataInicioFiltro(valor) {
    if (!valor) return '';
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}$/.test(texto)) {
        return `${texto}-01`;
    }
    return extrairDataISO(texto) || '';
}

function normalizarDataFimFiltro(valor) {
    if (!valor) return '';
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}$/.test(texto)) {
        const [ano, mes] = texto.split('-').map(Number);
        return `${texto}-${ultimoDiaDoMesISO(ano, mes)}`;
    }
    return extrairDataISO(texto) || '';
}

function parseNumero(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
    if (valor === null || valor === undefined) return 0;

    const texto = String(valor).trim();
    if (!texto) return 0;

    const normalizado = texto.includes(',')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto;

    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    inicializarEventos();
});

// ============================================================================
// CARREGAMENTO DE DADOS
// ============================================================================

function obterContextoAPI() {
    const path = window.location.pathname;
    const primeiro = path.split('/').filter(Boolean)[0];
    const systemID = typeof ebfGetSystemID === 'function' ? ebfGetSystemID() : 'GRT';
    return { primeiro, systemID };
}

async function buscarVendasDaAPI(primeiro, systemID, dataInicio, dataFim) {
    const url = window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_dados.rule?sys=' + systemID +
        '&dataIni=' + normalizarDataInicioFiltro(dataInicio) + '&dataFin=' + normalizarDataFimFiltro(dataFim);

    const response = await fetch(url);

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    const text = decoder.decode(buffer);
    const data = JSON.parse(text);

    if (data && data.error) {
        console.warn("API Error:", data.error);
        alert("Erro: " + data.error);
        return [];
    }

    const vendasRaw = Array.isArray(data.vendas) ? data.vendas : (Array.isArray(data) ? data : []);
    return vendasRaw.map(v => ({
        ...v,
        empresa: String(v.empresa || ''),
        marca: String(v.marca || ''),
        vendedor: String(v.vendedor || ''),
        grupo: String(v.grupo || ''),
        cliente: String(v.cliente || ''),
        regiao: String(v.regiao || ''),
        cidade: String(v.cidade || ''),
        rota: String(v.rota || ''),
        estado: String(v.estado || ''),
        tipo_pagamento: String(v.tipo_pagamento || ''),
        tipo_documento: String(v.tipo_documento || ''),
        status_documento: String(v.status_documento || ''),
        valor: parseNumero(v.valor),
        devolucao: parseNumero(v.devolucao),
        quantidade: parseNumero(v.quantidade),
        valor_produto: parseNumero(v.valor_produto),
        valor_servico: parseNumero(v.valor_servico),
        custo: parseNumero(v.custo)
    }));
}

function atualizarOpcoesDeFiltros() {
    state.opcoes.empresas = [...new Set(state.vendas.map(v => v.empresa))].sort();
    state.opcoes.marcas = [...new Set(state.vendas.map(v => v.marca))].sort();
    state.opcoes.vendedores = [...new Set(state.vendas.map(v => v.vendedor))].sort();
    state.opcoes.grupos = [...new Set(state.vendas.map(v => v.grupo))].sort();
    state.opcoes.clientes = [...new Set(state.vendas.map(v => v.cliente))].sort();
    state.opcoes.regioes = [...new Set(state.vendas.map(v => v.regiao))].sort();
    state.opcoes.cidades = [...new Set(state.vendas.map(v => v.cidade))].sort();
    state.opcoes.rotas = [...new Set(state.vendas.map(v => v.rota))].sort();
    state.opcoes.estados = [...new Set(state.vendas.map(v => v.estado))].sort();
    state.opcoes.tipos_pagamento = [...new Set(state.vendas.map(v => v.tipo_pagamento))].sort();
    state.opcoes.tipos_documento = [...new Set(state.vendas.map(v => v.tipo_documento))].sort();
    state.opcoes.status_documento = [...new Set(state.vendas.map(v => v.status_documento))].sort();
}

async function carregarDados() {
    mostrarSpinner();
    try {
        const { primeiro, systemID } = obterContextoAPI();
        
        // Buscar configurações primeiro
        await carregarConfiguracao(primeiro, systemID);
        
        // Atualizar datas dos filtros com base na configuração (usar datas completas ISO)
        if (state.configuracao.DATA_INI) {
            state.filtros.dataInicio = normalizarDataInicioFiltro(state.configuracao.DATA_INI);
            document.getElementById('dataInicio').value = state.filtros.dataInicio;
        }
        if (state.configuracao.DATA_FIN) {
            state.filtros.dataFim = normalizarDataFimFiltro(state.configuracao.DATA_FIN);
            document.getElementById('dataFim').value = state.filtros.dataFim;
        }
        
        state.vendas = await buscarVendasDaAPI(primeiro, systemID, state.filtros.dataInicio, state.filtros.dataFim);

        // (dados jÃ¡ carregados por buscarVendasDaAPI)

        // 2. Decodificamos explicitamente para UTF-8 (ou 'iso-8859-1' se o erro persistir)
        // (decodificaÃ§Ã£o feita em buscarVendasDaAPI)

        // 3. Transformamos a string corrigida em JSON
        // (parse feito em buscarVendasDaAPI)

        // (normalização feita em buscarVendasDaAPI)

        // Extrai opções únicas
        atualizarOpcoesDeFiltros();

        // Popula selects
        populaSelects();
        
        // Aplicar visibilidade dos gráficos baseado na configuração
        aplicarVisibilidadeGraficos();

        // Renderiza painel
        await atualizarPainel();
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
    } finally {
        ocultarSpinner();
    }
}

async function recarregarVendasDaAPI() {
    const { primeiro, systemID } = obterContextoAPI();
    state.vendas = await buscarVendasDaAPI(primeiro, systemID, state.filtros.dataInicio, state.filtros.dataFim);
    atualizarOpcoesDeFiltros();
    populaSelects();
}

function popularCheckbox(id, opcoes) {
    const container = document.getElementById(id);
    if (container) {
        const dimRaw = id.replace('filtro', '').toLowerCase();
        const mapaChaves = {
            tipopagamento: 'tipo_pagamento',
            tipodocumento: 'tipo_documento',
            statusdocumento: 'status_documento'
        };
        const dim = mapaChaves[dimRaw] || dimRaw;
        const selecionados = Array.isArray(state.filtros[dim]) ? state.filtros[dim] : [];

        container.innerHTML = opcoes.map(op => `
            <label class="chk-item">
                <input type="checkbox" value="${op}" ${selecionados.includes(op) ? 'checked' : ''}>
                <span>${op}</span>
            </label>
        `).join('');

        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const checked = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
                state.filtros[dim] = checked;
            });
        });
    }
}

function populaSelects() {
    popularCheckbox('filtroEmpresa', state.opcoes.empresas);
    popularCheckbox('filtroMarca', state.opcoes.marcas);
    popularCheckbox('filtroVendedor', state.opcoes.vendedores);
    popularCheckbox('filtroGrupo', state.opcoes.grupos);
    popularCheckbox('filtroCliente', state.opcoes.clientes);
    popularCheckbox('filtroRegiao', state.opcoes.regioes);
    popularCheckbox('filtroCidade', state.opcoes.cidades);
    popularCheckbox('filtroRota', state.opcoes.rotas);
    popularCheckbox('filtroEstado', state.opcoes.estados);
    popularCheckbox('filtroTipoPagamento', state.opcoes.tipos_pagamento);
    popularCheckbox('filtroTipoDocumento', state.opcoes.tipos_documento);
    popularCheckbox('filtroStatusDocumento', state.opcoes.status_documento);
}
// ============================================================================
// CARREGAMENTO DE CONFIGURAÇÃO
// ============================================================================

async function carregarConfiguracao(primeiro, systemID) {
    try {
        const response = await fetch(window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_config.rule?sys=' + systemID);
        
        // Usar o mesmo padrão de decodificação que os dados
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const text = decoder.decode(buffer);
        const data = JSON.parse(text);
        
        if (data && data.config && Array.isArray(data.config) && data.config.length > 0) {
            const configObj = data.config[0];
            // Mesclar configurações recebidas com o estado inicial
            state.configuracao = { ...state.configuracao, ...configObj };
            
            // Definir visualização inicial baseada em PED_OU_PED_E_OS
            if (state.configuracao.PED_OU_PED_E_OS === 'PP') {
                state.agrupamentos.visualizacao = 'totalizado';
            } else if (state.configuracao.PED_OU_PED_E_OS === 'PO') {
                state.agrupamentos.visualizacao = 'separado';
            }
            
            // Atualizar o select no DOM
            const selectVisualizacao = document.getElementById('visualizacaoGrafico');
            if (selectVisualizacao) {
                selectVisualizacao.value = state.agrupamentos.visualizacao;
            }
            
            console.log("Configurações carregadas:", state.configuracao);
        }
    } catch (err) {
        console.error('Erro ao carregar configurações:', err);
    }
}

// ============================================================================
// VISIBILIDADE DE GRÁFICOS
// ============================================================================

function aplicarVisibilidadeGraficos() {
    // Mapeamento de chaves de configuração para IDs de gráficos
    const mapeamentoGraficos = {
        'POR_EMPRESA': 'chart-empresa',
        'POR_MARCA': 'chart-marca',
        'POR_VENDEDOR': 'chart-vendedor',
        'POR_GRUPO': 'chart-grupo',
        'POR_REGIAO': 'chart-regiao',
        'POR_CIDADE': 'chart-cidade',
        'POR_ROTA': 'chart-rota',
        'POR_ESTADO': 'chart-estado',
        'POR_TIPO_PAGAMENTO': 'chart-tipo-pagamento',
        'POR_TIPO_DOCUMENTO': 'chart-tipo-documento',
        'POR_STATUS_DOCUMENTO': 'chart-status-documento'
    };
    
    // Iterar sobre cada configuração de gráfico
    Object.entries(mapeamentoGraficos).forEach(([chaveConfig, idGrafico]) => {
        const elemento = document.getElementById(idGrafico);
        if (elemento) {
            const chartWrapper = elemento.closest('.chart-wrapper');
            if (chartWrapper) {
                // Se a configuração for 'S' (sim), mostrar; caso contrário, ocultar
                if (state.configuracao[chaveConfig] === 'S') {
                    chartWrapper.style.display = 'block';
                    console.log(`Gráfico ${idGrafico} habilitado`);
                } else {
                    chartWrapper.style.display = 'none';
                    console.log(`Gráfico ${idGrafico} desabilitado`);
                }
            }
        }
    });
}


// ============================================================================
// EVENTOS
// ============================================================================

function inicializarEventos() {
    // Filtros
    document.getElementById('dataInicio').addEventListener('change', (e) => {
        state.filtros.dataInicio = normalizarDataInicioFiltro(e.target.value);
    });

    document.getElementById('dataFim').addEventListener('change', (e) => {
        state.filtros.dataFim = normalizarDataFimFiltro(e.target.value);
    });

    // Filtros por Coluna
    document.querySelectorAll('.col-filter').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const col = e.target.dataset.col;
                state.filtrosColuna[col] = e.target.value.toLowerCase();
                renderizarTabelaComSpinner();
            }
        });
        input.addEventListener('blur', (e) => {
            const col = e.target.dataset.col;
            state.filtrosColuna[col] = e.target.value.toLowerCase();
        });
    });

    // Botão para atualizar filtros da tabela analítica
    document.getElementById('btnAtualizarAnalitico')?.addEventListener('click', () => {
        document.querySelectorAll('.col-filter').forEach(input => {
            const col = input.dataset.col;
            state.filtrosColuna[col] = input.value.toLowerCase();
        });
        renderizarTabelaComSpinner();
    });

    // Agrupamentos
    document.getElementById('visualizacaoGrafico').addEventListener('change', (e) => {
        state.agrupamentos.visualizacao = e.target.value;
        atualizarPainelComSpinner();
    });

    document.getElementById('agrupamentoPeriodo').addEventListener('change', (e) => {
        state.agrupamentos.periodo = e.target.value;
        atualizarPainelComSpinner();
    });

    document.getElementById('tipoGrafico').addEventListener('change', (e) => {
        state.agrupamentos.tipoGrafico = e.target.value;
        atualizarPainelComSpinner();
    });

    // Botão Atualizar Filtros
    document.getElementById('btnAplicarFiltros').addEventListener('click', async () => {
        mostrarSpinner();
        try {
            await recarregarVendasDaAPI();
            await atualizarPainel();
        } finally {
            ocultarSpinner();
        }
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.classList.remove('ativo');
            document.body.style.overflow = 'auto';
        }
    });

    // Botão Analítico
    document.getElementById('btnVerAnalitico').addEventListener('click', () => {
        abrirModalAnalitico();
    });

    document.getElementById('btnVerAnaliticoCliente').addEventListener('click', () => {
        abrirModalAnalitico(state.modalCliente.cliente, state.modalCliente.dimensao);
    });

    // Fechar Modais
    document.getElementById('btnFecharModalCliente').addEventListener('click', fecharModalCliente);
    document.getElementById('btnFecharModalAnalitico').addEventListener('click', fecharModalAnalitico);
    document.getElementById('btnFecharModalProjecao').addEventListener('click', fecharModalProjecao);

    // Detalhes Projeção
    document.getElementById('btnDetalheProjecao').addEventListener('click', abrirModalProjecao);

    // Exportar
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
    
    // Filtro de valor mínimo no modal
    document.getElementById('btnAplicarFiltroModal')?.addEventListener('click', () => {
        state.modalCliente.valorMinimo = Number(document.getElementById('filtroValorMinimoCliente').value) || 0;
        atualizarGraficosModal();
    });

    // Adicionado: Abrir/Fechar Filtros
    // Controle do Drawer de Filtros (Funções globais para evitar conflitos)
    window.abrirFiltros = function() {
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    window.fecharFiltros = function() {
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    // Busca nos filtros
    document.querySelectorAll('.filtro-busca').forEach(input => {
        input.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const targetId = e.target.dataset.target;
            const container = document.getElementById(targetId);
            if (container) {
                const itens = container.querySelectorAll('.chk-item');
                itens.forEach(item => {
                    const texto = item.textContent.toLowerCase();
                    item.style.display = texto.includes(termo) ? 'flex' : 'none';
                });
            }
        });
    });
}

// ============================================================================
// FILTRAGEM DE DADOS
// ============================================================================

function filtrarVendas(incluirFiltrosColuna = false, clienteExtra = null, dimensaoExtra = null) {
    return state.vendas.filter(venda => {
        const dataVenda = parseDataLocal(venda.data);
        const dataInicio = parseDataLocal(state.filtros.dataInicio);
        const dataFim = parseDataLocal(state.filtros.dataFim, { endOfDay: true });

        const dentroData = (!dataInicio || (dataVenda && dataVenda >= dataInicio)) &&
            (!dataFim || (dataVenda && dataVenda <= dataFim));
        const empresaOk = state.filtros.empresa.length === 0 || state.filtros.empresa.includes(venda.empresa);
        const marcaOk = state.filtros.marca.length === 0 || state.filtros.marca.includes(venda.marca);
        const vendedorOk = state.filtros.vendedor.length === 0 || state.filtros.vendedor.includes(venda.vendedor);
        const grupoOk = state.filtros.grupo.length === 0 || state.filtros.grupo.includes(venda.grupo);
        const clienteOk = state.filtros.cliente.length === 0 || state.filtros.cliente.includes(venda.cliente);
        const regiaoOk = state.filtros.regiao.length === 0 || state.filtros.regiao.includes(venda.regiao);
        const cidadeOk = state.filtros.cidade.length === 0 || state.filtros.cidade.includes(venda.cidade);
        const rotaOk = state.filtros.rota.length === 0 || state.filtros.rota.includes(venda.rota);
        const estadoOk = state.filtros.estado.length === 0 || state.filtros.estado.includes(venda.estado);
        const tipoPagamentoOk = state.filtros.tipo_pagamento.length === 0 || state.filtros.tipo_pagamento.includes(venda.tipo_pagamento);
        const tipoDocumentoOk = state.filtros.tipo_documento.length === 0 || state.filtros.tipo_documento.includes(venda.tipo_documento);
        const statusDocumentoOk = state.filtros.status_documento.length === 0 || state.filtros.status_documento.includes(venda.status_documento);

        let extraOk = true;
        if (clienteExtra && dimensaoExtra) {
            extraOk = venda[dimensaoExtra] === clienteExtra;
        }

        let colunaOk = true;
        if (incluirFiltrosColuna) {
            const dataStr = formatarDataPtBR(venda.data);
            colunaOk = dataStr.toLowerCase().includes(state.filtrosColuna.data) &&
                venda.empresa.toLowerCase().includes(state.filtrosColuna.empresa) &&
                venda.marca.toLowerCase().includes(state.filtrosColuna.marca) &&
                venda.vendedor.toLowerCase().includes(state.filtrosColuna.vendedor) &&
                venda.grupo.toLowerCase().includes(state.filtrosColuna.grupo) &&
                venda.cliente.toLowerCase().includes(state.filtrosColuna.cliente) &&
                venda.regiao.toLowerCase().includes(state.filtrosColuna.regiao) &&
                venda.cidade.toLowerCase().includes(state.filtrosColuna.cidade) &&
                venda.rota.toLowerCase().includes(state.filtrosColuna.rota) &&
                venda.estado.toLowerCase().includes(state.filtrosColuna.estado) &&
                venda.tipo_pagamento.toLowerCase().includes(state.filtrosColuna.tipo_pagamento) &&
                venda.tipo_documento.toLowerCase().includes(state.filtrosColuna.tipo_documento) &&
                venda.status_documento.toLowerCase().includes(state.filtrosColuna.status_documento);
        }

        return dentroData && empresaOk && marcaOk && vendedorOk && grupoOk && clienteOk &&
            regiaoOk && cidadeOk && rotaOk && estadoOk && tipoPagamentoOk && tipoDocumentoOk && statusDocumentoOk &&
            extraOk && colunaOk;
    });
}

// ============================================================================
// CÁLCULO DE KPIs E PROJEÇÃO
// ============================================================================

async function buscarNumPedidos() {
    const formatarMultifiltro = (arr) => {
        if (!arr || arr.length === 0) return '';
        return arr.join('|');
    };

    const params = new URLSearchParams({
        sys: typeof ebfGetSystemID === 'function' ? ebfGetSystemID() : 'GRT',
        empresas: formatarMultifiltro(state.filtros.empresa),
        vendedores: formatarMultifiltro(state.filtros.vendedor),
        marcas: formatarMultifiltro(state.filtros.marca),
        grupos: formatarMultifiltro(state.filtros.grupo),
        clientes: formatarMultifiltro(state.filtros.cliente),
        regioes: formatarMultifiltro(state.filtros.regiao),
        cidades: formatarMultifiltro(state.filtros.cidade),
        rotas: formatarMultifiltro(state.filtros.rota),
        estados: formatarMultifiltro(state.filtros.estado),
        tipos_pagamento: formatarMultifiltro(state.filtros.tipo_pagamento),
        tipos_documento: formatarMultifiltro(state.filtros.tipo_documento),
        status_documento: formatarMultifiltro(state.filtros.status_documento),
        dataIni: normalizarDataInicioFiltro(state.filtros.dataInicio),
        dataFin: normalizarDataFimFiltro(state.filtros.dataFim)
    });

    try {
        const path = window.location.pathname;
        const primeiro = path.split('/').filter(Boolean)[0];
        const url = window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_dados_num_pedidos.rule?' + params.toString();
        const response = await fetch(url);
        const data = await response.json();
        state.numPedidos = data.numPedidos || 0;
    } catch (err) {
        console.error('Erro ao buscar numPedidos:', err);
        state.numPedidos = 0;
    }
}

function calcularKPIs(vendas) {
    const faturamento = vendas.reduce((sum, v) => {
        const totalLinha = v.valor_produto + v.valor_servico;
        return sum + totalLinha;
    }, 0);
    const devolucao = vendas.reduce((sum, v) => sum + v.devolucao, 0);
    const custo = vendas.reduce((sum, v) => sum + v.custo, 0);
    const quantidade = vendas.reduce((sum, v) => sum + v.quantidade, 0);

    const rentabilidade = faturamento > 0 ? ((faturamento - custo) / faturamento) * 100 : 0;

    // Novo cálculo do ticket médio baseado no numPedidos da API
    const ticketMedio = state.numPedidos > 0 ? faturamento / state.numPedidos : 0;

    // Lógica de Projeção: faturamento já considera devolução abatida na soma de produto + serviço
    const valorTotal = faturamento;
    const projecao = calcularProjecao(state.agrupamentos.periodo, state.filtros.dataFim, valorTotal);

    return { faturamento, ticketMedio, projecao, devolucao, custo, rentabilidade };
}

function calcularProjecao(periodo, dataFimFiltro, valorTotal) {
    if (!dataFimFiltro) {
        state.detalhesProjecao = { valorTotal, diasPassados: 0, diasFaltantes: 0, mediaDia: 0, resultado: valorTotal };
        return valorTotal;
    }

    const [ano, mes, dia] = dataFimFiltro.split('-').map(Number);
    let diasPassados = dia;
    let diasFaltantes = 0;

    if (periodo === 'ano') {
        const dataReferencia = new Date(ano, mes - 1, dia);
        const inicioAno = new Date(ano, 0, 1);
        const fimAno = new Date(ano, 11, 31);
        diasPassados = Math.round((dataReferencia - inicioAno) / (1000 * 60 * 60 * 24)) + 1;
        diasFaltantes = Math.round((fimAno - dataReferencia) / (1000 * 60 * 60 * 24));
    } else {
        const ultimoDiaMes = new Date(ano, mes, 0).getDate();
        diasPassados = dia;
        diasFaltantes = ultimoDiaMes - dia;
    }

    if (diasPassados <= 0) {
        state.detalhesProjecao = { valorTotal, diasPassados, diasFaltantes, mediaDia: 0, resultado: valorTotal };
        return valorTotal;
    }

    const mediaDia = valorTotal / diasPassados;
    const resultado = valorTotal + (mediaDia * diasFaltantes);

    // Salvar detalhes para o modal
    state.detalhesProjecao = {
        valorTotal,
        diasPassados,
        diasFaltantes,
        mediaDia,
        resultado
    };

    return resultado;
}

async function atualizarKPIs() {
    // Primeiro busca o número de pedidos atualizado com os filtros
    await buscarNumPedidos();

    const vendas = filtrarVendas();
    const kpis = calcularKPIs(vendas);

    document.getElementById('kpi-faturamento').textContent = formatarMoeda(kpis.faturamento);
    document.getElementById('kpi-ticket').textContent = formatarMoeda(kpis.ticketMedio);
    document.getElementById('kpi-projecao').textContent = formatarMoeda(kpis.projecao);
    document.getElementById('kpi-devolucao').textContent = formatarMoeda(kpis.devolucao);
    document.getElementById('kpi-custo').textContent = formatarMoeda(kpis.custo);
    document.getElementById('kpi-rentabilidade').textContent = "Rentabilidade: "+kpis.rentabilidade.toFixed(1).replace('.', ',') + '%';
}

// ============================================================================
// AGRUPAMENTO DE DADOS
// ============================================================================

function agruparPorPeriodo(vendas, tipo) {
    const agrupado = {};
    vendas.forEach(venda => {
        const data = parseDataLocal(venda.data);
        if (!data) return;
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (!agrupado[chave]) {
            agrupado[chave] = { valor_produto: 0, valor_servico: 0, valor_total: 0, custo: 0 };
        }
        const totalLinha = venda.valor_produto + venda.valor_servico;
        const valorEfetivo = totalLinha;
        
        agrupado[chave].valor_produto += venda.valor_produto;
        agrupado[chave].valor_servico += venda.valor_servico;
        agrupado[chave].valor_total += valorEfetivo;
        agrupado[chave].custo += venda.custo;
    });

    const lista = Object.entries(agrupado).map(([periodo, dados]) => ({
        periodo,
        valor_produto: dados.valor_produto,
        valor_servico: dados.valor_servico,
        custo: dados.custo,
        valor_total: dados.valor_total
    })).sort((a, b) => a.periodo.localeCompare(b.periodo));
    
    return lista.map((item, index) => {
        let variacao = index > 0 && lista[index - 1].valor_total > 0 ? ((item.valor_total - lista[index - 1].valor_total) / lista[index - 1].valor_total) * 100 : 0;
        return { ...item, variacao };
    });
}

function agruparPorDimensao(vendas, dimensao, limite = null) {
    const agrupado = {};
    vendas.forEach(venda => {
        const chave = venda[dimensao];
        const totalLinha = venda.valor_produto + venda.valor_servico;
        const valorEfetivo = totalLinha;
        agrupado[chave] = (agrupado[chave] || 0) + valorEfetivo;
    });

    let resultado = Object.entries(agrupado).map(([label, valor]) => ({ label, valor }));

    // Se for no modal e a dimensão for cliente, aplicar filtro de valor mínimo
    if (dimensao === 'cliente' && state.modalCliente.valorMinimo > 0) {
        resultado = resultado.filter(item => item.valor >= state.modalCliente.valorMinimo);
    }

    resultado.sort((a, b) => b.valor - a.valor);
    if (limite) resultado = resultado.slice(0, limite);
    return resultado;
}

function agruparClientesPorPeriodo(vendas, tipo) {
    const clientesUnicos = [...new Set(vendas.map(v => v.cliente))].sort();
    const periodos = [...new Set(vendas.map(v => {
        const data = parseDataLocal(v.data);
        if (!data) return null;
        return tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    }).filter(Boolean))].sort();

    const agrupado = {};
    const totaisPorCliente = {};

    clientesUnicos.forEach(cliente => {
        agrupado[cliente] = {};
        totaisPorCliente[cliente] = 0;
        periodos.forEach(p => agrupado[cliente][p] = 0);
    });

    vendas.forEach(venda => {
        const data = parseDataLocal(venda.data);
        if (!data) return;
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        const totalLinha = venda.valor_produto + venda.valor_servico;
        const valorEfetivo = totalLinha;
        agrupado[venda.cliente][chave] += valorEfetivo;
        totaisPorCliente[venda.cliente] += valorEfetivo;
    });

    // Aplicar filtro de valor mínimo se estiver no modal
    const valorMinimo = state.modalCliente.valorMinimo || 0;
    const clientesFiltrados = clientesUnicos.filter(cliente => totaisPorCliente[cliente] >= valorMinimo);

    return { clientes: clientesFiltrados, periodos, dados: agrupado };
}

// ============================================================================
// RENDERIZAÇÃO DE GRÁFICOS
// ============================================================================

function renderizarGraficos() {
    const vendas = filtrarVendas();

    // Período Principal
    renderizarGraficoPeriodo('chart-periodo', agruparPorPeriodo(vendas, state.agrupamentos.periodo));
    document.getElementById('titulo-periodo').textContent = `Faturamento por ${state.agrupamentos.periodo === 'ano' ? 'Ano' : 'Mês'}`;

    // Dimensões
    renderizarGraficoDimensao('chart-empresa', agruparPorDimensao(vendas, 'empresa', 10), 'empresa');
    renderizarGraficoDimensao('chart-marca', agruparPorDimensao(vendas, 'marca', 10), 'marca');
    renderizarGraficoDimensao('chart-vendedor', agruparPorDimensao(vendas, 'vendedor', 10), 'vendedor');
    renderizarGraficoDimensao('chart-grupo', agruparPorDimensao(vendas, 'grupo', 10), 'grupo');
    renderizarGraficoDimensao('chart-regiao', agruparPorDimensao(vendas, 'regiao', 10), 'regiao');
    renderizarGraficoDimensao('chart-cidade', agruparPorDimensao(vendas, 'cidade', 10), 'cidade');
    renderizarGraficoDimensao('chart-rota', agruparPorDimensao(vendas, 'rota', 10), 'rota');
    renderizarGraficoDimensao('chart-estado', agruparPorDimensao(vendas, 'estado', 10), 'estado');
    renderizarGraficoDimensao('chart-tipo-pagamento', agruparPorDimensao(vendas, 'tipo_pagamento', 10), 'tipo_pagamento');
    renderizarGraficoDimensao('chart-tipo-documento', agruparPorDimensao(vendas, 'tipo_documento', 10), 'tipo_documento');
    renderizarGraficoDimensao('chart-status-documento', agruparPorDimensao(vendas, 'status_documento', 10), 'status_documento');
}

function renderizarGraficoPeriodo(containerId, dados, type = 'column') {
    // Calcular faturamento total para porcentagem de custo
    const faturamentoTotal = dados.reduce((sum, d) => sum + d.valor_total, 0);
    const isSeparado = state.agrupamentos.visualizacao === 'separado';
    
    const series = [];
    
    // Usar dataLabels padrão — formatação abreviada aplicada via formatter global
    const dataLabelsFaturamento = {};

    if (isSeparado) {
        series.push({
            name: 'Produto',
            type: type,
            data: dados.map(d => d.valor_produto),
            color: '#3B82F6',
            stack: 'faturamento'
        });
        series.push({
            name: 'Serviço',
            type: type,
            data: dados.map(d => d.valor_servico),
            color: '#10B981',
            stack: 'faturamento'
        });
    } else {
        series.push({
            name: 'Faturamento',
            type: type,
            data: dados.map(d => d.valor_total),
            color: '#3B82F6',
            stack: 'faturamento'
        });
    }
    
    // Custo (usar dataLabels padrão/global)
    series.push({
        name: 'Custo',
        type: 'column',
        yAxis: 1,
        data: dados.map((d, idx) => ({
            y: d.custo,
            pct: d.valor_total > 0 ? (d.custo / d.valor_total * 100) : 0,
            index: idx
        })),
        color: '#EF4444',
        stack: 'custo'
    });

    Highcharts.chart(containerId, {
        chart: { 
            type: type, 
            backgroundColor: 'transparent', 
            zIndex: 0,
            spacingTop: 24,
            scrollablePlotArea: {
                minWidth: window.innerWidth < 768 ? 600 : 0,
                scrollPositionX: 0
            }
        },
        title: { text: null },
        xAxis: {
            categories: dados.map(d => d.periodo),
            crosshair: true,
            labels: {
                useHTML: true,
                formatter: function() {
                    const index = dados.findIndex(d => d.periodo === this.value);
                    const item = dados[index];
                    let label = '<div style="text-align: center; line-height: 1.2; font-family: \'Poppins\', sans-serif;">' + this.value;
                    if (item && item.variacao !== 0) {
                        const color = item.variacao >= 0 ? '#10B981' : '#EF4444';
                        const icon = item.variacao >= 0 ? '▲' : '▼';
                        label += '<br/><span style="background-color: ' + (item.variacao >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') + '; color: ' + color + '; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; display: inline-block; margin-top: 4px; border: 1px solid ' + (item.variacao >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') + ';">' + icon + ' ' + Math.abs(item.variacao).toFixed(1) + '%</span>';
                    }
                    label += '</div>';
                    return label;
                }
            }
        },
        yAxis: [{
            title: { text: null },
            labels: { format: 'R$ {value:,.0f}' },
            maxPadding: 0.2
        }, {
            title: { text: null },
            labels: { enabled: false },
            opposite: true
        }],
        legend: {
            enabled: true,
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
        },
        tooltip: {
            outside: true,
            shared: true,
            useHTML: true,
            style: { pointerEvents: 'none' },
            positioner: function (labelWidth, labelHeight, point) {
                return { x: point.plotX + 10, y: point.plotY - 20 };
            },
            formatter: function () {
                let html = '<b>' + this.points[0].point.category + '</b><br>';
                
                this.points.forEach(point => {
                    const item = dados[point.point.index];
                    console.log('Tooltip item:', item);
                    console.log('Tooltip point:', point);
                    if (point.series.name === 'Produto') {
                        html += 'Produto: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Serviço') {
                        html += 'Serviço: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Faturamento') {
                        html += 'Faturamento: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                        html += '&nbsp;&nbsp;• Produto: R$ ' + item.valor_produto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                        html += '&nbsp;&nbsp;• Serviço: R$ ' + item.valor_servico.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Custo') {
                        const rentabilidade = item.valor_total > 0 ? ((item.valor_total - item.custo) / item.valor_total * 100) : 0;
                        html += 'Custo: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' (' + rentabilidade.toFixed(1) + '% de rentabilidade)<br>';
                    }
                });
                
                const item = dados[this.points[0].point.index];
                const variacaoStr = item.variacao !== 0 ?
                    '<span style="color:' + (item.variacao >= 0 ? '#10B981' : '#EF4444') + '; font-weight: bold;">' +
                        (item.variacao >= 0 ? '▲' : '▼') + ' ' + Math.abs(item.variacao).toFixed(1) + '% vs período anterior' +
                    '</span>' : '';
                
                return html + variacaoStr;
            }
        },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    useHTML: true,
                    formatter: function() {
                        if (this.y <= 0) return null;
                        const valorAbrev = abreviarValor(this.y);
                        if (state.agrupamentos && state.agrupamentos.periodo === 'mes') {
                            return '<span style="background-color: rgba(59,130,246,0.08); padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">' + valorAbrev + '</span>';
                        }
                        return valorAbrev;
                    },
                    inside: false,
                    style: { textOutline: 'none' }
                }
            },
            column: {
                pointPadding: 0.2,
                borderWidth: 0,
                stacking: isSeparado ? 'normal' : undefined
            },
            line: {
                dataLabels: {
                    enabled: false
                }
            }
        },
        series: series,
        credits: { enabled: false }
    });
}

function renderizarGraficoDimensao(containerId, dados, dimensao) {
    const cores = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#FBBF24', '#FCD34D', '#EF4444', '#F87171', '#FCA5A5'];

    // Calcular faturamento total geral filtrado do dashboard ou específico do modal para o cálculo exato do %
    const isModal = containerId === 'chart-cliente-total';
    const vendasFiltradas = isModal 
        ? filtrarVendas(false, state.modalCliente.cliente, state.modalCliente.dimensao)
        : filtrarVendas();
    const faturamentoTotal = vendasFiltradas.reduce((sum, v) => {
        const totalLinha = v.valor_produto + v.valor_servico;
        return sum + totalLinha;
    }, 0);

    if (state.agrupamentos.tipoGrafico === 'barras') {
        // Calcula altura dinâmica: ~30px por item + margem
        const alturaGrafico = Math.max(420, dados.length * 30 + 60);

        Highcharts.chart(containerId, {
            chart: {
                type: 'bar',
                backgroundColor: 'transparent',
                zIndex: 0,
                height: alturaGrafico,
                scrollablePlotArea: {
                    minHeight: alturaGrafico,
                    minWidth: window.innerWidth < 768 ? 500 : 0,
                    scrollPositionX: 0
                }
            },
            title: { text: null },
            xAxis: {
                categories: dados.map(d => d.label),
                scrollbar: { enabled: true }
            },
            yAxis: { title: { text: null }, scrollbar: { enabled: true } },
            tooltip: {
                outside: true,
                useHTML: true,
                zIndex: 99999,
                style: { zIndex: 99999, position: 'absolute', pointerEvents: 'none' },
                positioner: function (labelWidth, labelHeight, point) {
                    return { x: point.plotX + 10, y: point.plotY - 20 };
                },
                formatter: function () {
                    const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                    return `<b>${this.category}</b><br>Faturamento: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct.toFixed(1)}% do total)`;
                }
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                        allowOverlap: false,
                        formatter: function() {
                            const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                            return '<span style="background-color: rgba(255, 255, 255, 0.85); padding: 2px 4px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.12); box-shadow: 0 1px 3px rgba(0,0,0,0.08); color: #1F2937; font-weight: bold; font-size: 11px; white-space: nowrap;">R$ ' + 
                                   this.y.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + 
                                   ' (' + pct.toFixed(1) + '%)</span>';
                        },
                        style: { fontSize: '14.4px', zIndex: 9999 },
                        zIndex: 9999
                    },
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: function () {
                                abrirModalCliente(this.name || this.category, dimensao);
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Faturamento',
                data: dados.map((d, i) => ({ 
                    name: d.label, 
                    y: d.valor, 
                    color: cores[i % cores.length] 
                }))
            }],
            credits: { enabled: false }
        });
    } else {
        // Para gráficos de pizza, limitar a 15 itens
        const dadosPizza = dados.slice(0, 15);
        Highcharts.chart(containerId, {
            chart: { 
                type: 'pie', 
                backgroundColor: 'transparent', 
                zIndex: 0
            },
            title: { text: null },
            tooltip: {
                outside: true,
                useHTML: true,
                zIndex: 99999,
                style: { zIndex: 99999, position: 'absolute', pointerEvents: 'none' },
                positioner: function (labelWidth, labelHeight, point) {
                    return { x: point.plotX + 10, y: point.plotY - 20 };
                },
                formatter: function () {
                    const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                    return `<b>${this.point.name}</b><br/>Faturamento: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct.toFixed(1)}%)`;
                }
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                        allowOverlap: false,
                        formatter: function() {
                            const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                            return '<b>' + this.point.name + '</b>: ' + pct.toFixed(1) + '%';
                        },
                        style: { fontSize: '14.4px' }
                    },
                    point: {
                        events: {
                            click: function () {
                                abrirModalCliente(this.name, dimensao);
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Faturamento',
                colorByPoint: true,
                data: dadosPizza.map(d => ({ name: d.label, y: d.valor }))
            }],
            credits: { enabled: false }
        });
    }
}

// ============================================================================
// MODAIS E ANALÍTICO
// ============================================================================

function abrirModalCliente(cliente, dimensao) {
    state.modalCliente.cliente = cliente;
    state.modalCliente.dimensao = dimensao;
    state.modalCliente.valorMinimo = 0;
    document.getElementById('filtroValorMinimoCliente').value = 0;
    document.getElementById('modal-titulo').textContent = `Análise: ${cliente}`;
    document.getElementById('modalCliente').classList.add('ativo');
    document.body.style.overflow = 'hidden';
    atualizarGraficosModal();
}

function fecharModalCliente() {
    document.getElementById('modalCliente').classList.remove('ativo');
    document.body.style.overflow = 'auto';
}

function atualizarGraficosModal() {
    const vendas = filtrarVendas(false, state.modalCliente.cliente, state.modalCliente.dimensao);
    const valorMinimo = state.modalCliente.valorMinimo;

    // Gráfico de Período no Modal (Cada linha é um cliente, eixo X são os meses)
    renderizarGraficoClientesPeriodo('chart-cliente-periodo', agruparClientesPorPeriodo(vendas, state.agrupamentos.periodo));

    // Gráfico Total no Modal (Valor Total por Cliente)
    renderizarGraficoDimensao('chart-cliente-total', agruparPorDimensao(vendas, 'cliente', 15), 'cliente');
}

function abrirModalAnalitico(cliente = null, dimensao = null) {
    document.getElementById('modalAnalitico').classList.add('ativo');
    document.body.style.overflow = 'hidden';
    renderizarTabelaAnalitica(cliente, dimensao);
}

function fecharModalAnalitico() {
    document.getElementById('modalAnalitico').classList.remove('ativo');
    document.body.style.overflow = 'auto';
}

function abrirModalProjecao() {
    const d = state.detalhesProjecao;
    const content = document.getElementById('detalhes-projecao-content');
    
    content.innerHTML = `
        <div class="projecao-detalhe-item">
            <span class="projecao-detalhe-label">Faturamento Atual - Devolução:</span>
            <span class="projecao-detalhe-valor">${formatarMoeda(d.valorTotal)}</span>
        </div>
        <div class="projecao-detalhe-item">
            <span class="projecao-detalhe-label">Dias Decorridos:</span>
            <span class="projecao-detalhe-valor">${d.diasPassados} dias</span>
        </div>
        <div class="projecao-detalhe-item">
            <span class="projecao-detalhe-label">Média Diária:</span>
            <span class="projecao-detalhe-valor">${formatarMoeda(d.mediaDia)}</span>
        </div>
        <div class="projecao-detalhe-item">
            <span class="projecao-detalhe-label">Dias Restantes:</span>
            <span class="projecao-detalhe-valor">${d.diasFaltantes} dias</span>
        </div>
        <div class="projecao-detalhe-item" style="border-top: 2px solid var(--primary-color); margin-top: 0.5rem; padding-top: 1rem;">
            <span class="projecao-detalhe-label" style="color: var(--primary-color); font-size: 1rem;">Projeção Final:</span>
            <span class="projecao-detalhe-valor" style="color: var(--primary-color); font-size: 1.1rem;">${formatarMoeda(d.resultado)}</span>
        </div>
        <div class="projecao-formula">
            <strong>Fórmula:</strong><br>
            Projeção = Faturamento Atual + (Média Diária × Dias Restantes)
        </div>
    `;

    document.getElementById('modalProjecao').classList.add('ativo');
    document.body.style.overflow = 'hidden';
}

function fecharModalProjecao() {
    document.getElementById('modalProjecao').classList.remove('ativo');
    document.body.style.overflow = 'auto';
}

function renderizarTabelaComSpinner() {
    const container = document.getElementById('tabelaVendas');
    if (container) container.innerHTML = '<tr><td colspan="18" style="text-align:center; padding: 2rem;">Carregando...</td></tr>';
    setTimeout(() => renderizarTabelaAnalitica(), 100);
}

function renderizarTabelaAnalitica(cliente = null, dimensao = null) {
    const vendas = filtrarVendas(true, cliente, dimensao);
    const tbody = document.getElementById('tabelaVendas');
    const tfoot = document.getElementById('tabelaVendasFooter');

    if (!tbody) return;

    tbody.innerHTML = vendas.map(v => {
        const valorTotalLinha = v.valor_produto + v.valor_servico;
        return `
        <tr>
            <td>${formatarDataPtBR(v.data)}</td>
            <td>${v.empresa}</td>
            <td>${v.marca}</td>
            <td>${v.vendedor}</td>
            <td>${v.grupo}</td>
            <td>${v.cliente}</td>
            <td>${v.regiao}</td>
            <td>${v.cidade}</td>
            <td>${v.rota}</td>
            <td>${v.estado}</td>
            <td>${v.tipo_pagamento}</td>
            <td>${v.tipo_documento}</td>
            <td>${v.status_documento}</td>
            <td class="numero">${formatarMoeda(v.valor_produto)}</td>
            <td class="numero">${formatarMoeda(v.valor_servico)}</td>
            <td class="numero">${formatarMoeda(valorTotalLinha)}</td>
            <td class="numero">${formatarMoeda(v.devolucao)}</td>
            <td class="numero">${formatarMoeda(v.custo)}</td>
        </tr>
    `;
    }).join('');

    const totais = vendas.reduce((acc, v) => {
        const valorTotalLinha = v.valor_produto + v.valor_servico;
        return {
            total: acc.total + valorTotalLinha,
            valorProduto: acc.valorProduto + v.valor_produto,
            valorServico: acc.valorServico + v.valor_servico,
            devolucao: acc.devolucao + v.devolucao,
            custo: acc.custo + v.custo
        };
    }, { total: 0, valorProduto: 0, valorServico: 0, devolucao: 0, custo: 0 });

    tfoot.innerHTML = `
        <tr>
            <td colspan="13">TOTAIS (${vendas.length} registros)</td>
            <td class="numero">${formatarMoeda(totais.valorProduto)}</td>
            <td class="numero">${formatarMoeda(totais.valorServico)}</td>
            <td class="numero">${formatarMoeda(totais.total)}</td>
            <td class="numero">${formatarMoeda(totais.devolucao)}</td>
            <td class="numero">${formatarMoeda(totais.custo)}</td>
        </tr>
    `;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function abreviarValor(valor) {
    if (valor >= 1000000) {
        return (valor / 1000000).toFixed(1).replace('.', ',') + ' Mi';
    }
    if (valor >= 1000) {
        return (valor / 1000).toFixed(1).replace('.', ',') + ' k';
    }
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mostrarSpinner() {
    document.getElementById('spinnerOverlay').classList.add('ativo');
}

function ocultarSpinner() {
    document.getElementById('spinnerOverlay').classList.remove('ativo');
}

async function atualizarPainel() {
    await atualizarKPIs();
    renderizarGraficos();
}

async function atualizarPainelComSpinner() {
    mostrarSpinner();
    try {
        await atualizarPainel();
    } finally {
        ocultarSpinner();
    }
}

function exportarExcel() {
    const vendas = filtrarVendas(true);
    const data = vendas.map(v => {
        const valorTotalLinha = v.valor_produto + v.valor_servico;
        return {
            'Data': formatarDataPtBR(v.data),
            'Empresa': v.empresa,
            'Marca': v.marca,
            'Vendedor': v.vendedor,
            'Grupo': v.grupo,
            'Cliente': v.cliente,
            'Região': v.regiao,
            'Cidade': v.cidade,
            'Rota': v.rota,
            'Estado': v.estado,
            'Tipo Pagamento': v.tipo_pagamento,
            'Tipo Documento': v.tipo_documento,
            'Status Documento': v.status_documento,
            'Valor Produto': v.valor_produto,
            'Valor Serviço': v.valor_servico,
            'Valor': valorTotalLinha,
            'Devolução': v.devolucao,
            'Custo': v.custo
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "vendas_analitico.xlsx");
}

function renderizarGraficoClientesPeriodo(containerId, resultado) {
    const { clientes, periodos, dados } = resultado;
    
    const series = clientes.map(cliente => ({
        name: cliente,
        type: 'line',
        data: periodos.map(p => dados[cliente][p] || 0)
    }));

    Highcharts.chart(containerId, {
        chart: { 
            type: 'line', 
            backgroundColor: 'transparent', 
            zIndex: 0,
            scrollablePlotArea: {
                minWidth: window.innerWidth < 768 ? 600 : 0,
                scrollPositionX: 0
            }
        },
        title: { text: null },
        xAxis: { categories: periodos, crosshair: true },
        yAxis: {
            title: { text: null },
            labels: { format: 'R$ {value:,.0f}' }
        },
        tooltip: {
            shared: true,
            useHTML: true,
            backgroundColor: '#ffffff',
            borderColor: '#ccc',
            borderWidth: 1,
            shadow: true,
            style: {
                fontSize: '14.4px',
                zIndex: 9999
            },
            formatter: function () {
                if (!this.points) return '';
                const pontosOrdenados = this.points.slice().sort((a, b) => b.y - a.y);
                let s = `<div style="padding: 5px;"><b>${this.x}</b><br/>`;
                let totalMes = 0;
                pontosOrdenados.forEach(point => {
                    if (point.y > 0) {
                        s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${formatarMoeda(point.y)}</b><br/>`;
                        totalMes += point.y;
                    }
                });
                if (pontosOrdenados.length > 1) {
                    s += `<hr style="margin: 5px 0; border: none; border-top: 1px solid #ccc;">`;
                    s += `<b>Total:</b> <b>${formatarMoeda(totalMes)}</b>`;
                }
                s += `</div>`;
                return s;
            }
        },
        plotOptions: {
            line: {
                dataLabels: {
                    enabled: true,
                    allowOverlap: false,
                    formatter: function() {
                        return this.y > 0 ? abreviarValor(this.y) : null;
                    },
                    style: {
                        fontSize: '12px',
                        fontWeight: 'normal',
                        textOutline: 'none'
                    }
                },
                marker: { enabled: true, radius: 4 },
                lineWidth: 2,
                states: { hover: { lineWidth: 3 } }
            }
        },
        series: series,
        legend: {
            enabled: true,
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
        },
        credits: { enabled: false }
    });
}
