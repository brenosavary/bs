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
// INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    inicializarEventos();
});

// ============================================================================
// CARREGAMENTO DE DADOS
// ============================================================================

async function carregarDados() {
    mostrarSpinner();
    try {
        const path = window.location.pathname;
        const primeiro = path.split('/').filter(Boolean)[0];
        const systemID = typeof ebfGetSystemID === 'function' ? ebfGetSystemID() : 'GRT';
        
        // Buscar configurações primeiro
        await carregarConfiguracao(primeiro, systemID);
        
        // Atualizar datas dos filtros com base na configuração
        if (state.configuracao.DATA_INI) {
            state.filtros.dataInicio = state.configuracao.DATA_INI.split(' ')[0];
            document.getElementById('dataInicio').value = state.filtros.dataInicio;
        }
        if (state.configuracao.DATA_FIN) {
            state.filtros.dataFim = state.configuracao.DATA_FIN.split(' ')[0];
            document.getElementById('dataFim').value = state.filtros.dataFim;
        }
        
        const response = await fetch(window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_dados.rule?sys=' + systemID + '&dataIni=' + (state.filtros.dataInicio || '') + '&dataFin=' + (state.filtros.dataFim || ''));

        // 1. Pegamos a resposta como arrayBuffer em vez de .json() direto
        const buffer = await response.arrayBuffer();

        // 2. Decodificamos explicitamente para UTF-8 (ou 'iso-8859-1' se o erro persistir)
        const decoder = new TextDecoder('iso-8859-1');
        const text = decoder.decode(buffer);

        // 3. Transformamos a string corrigida em JSON
        const data = JSON.parse(text);

        if (data && data.error) {
            console.warn("API Error:", data.error);
            alert("Erro: " + data.error);
            state.vendas = [];
        } else {
            let vendasRaw = Array.isArray(data.vendas) ? data.vendas : (Array.isArray(data) ? data : []);
            // Normalizar os tipos para evitar erros no Highcharts (números em formato de string) e em métodos como toLowerCase
            state.vendas = vendasRaw.map(v => ({
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
                valor: Number(v.valor) || 0,
                devolucao: Number(v.devolucao) || 0,
                quantidade: Number(v.quantidade) || 0,
                valor_produto: Number(v.valor_produto) || 0,
                valor_servico: Number(v.valor_servico) || 0,
                custo: Number(v.custo) || 0
            }));
        }

        // Extrai opções únicas
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

function popularCheckbox(id, opcoes) {
    const container = document.getElementById(id);
    if (container) {
        container.innerHTML = opcoes.map(op => `
            <label class="chk-item">
                <input type="checkbox" value="${op}">
                <span>${op}</span>
            </label>
        `).join('');

        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const checked = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
                const dim = id.replace('filtro', '').toLowerCase();
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
        state.filtros.dataInicio = e.target.value;
    });

    document.getElementById('dataFim').addEventListener('change', (e) => {
        state.filtros.dataFim = e.target.value;
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
        atualizarPainel();
    });

    document.getElementById('agrupamentoPeriodo').addEventListener('change', (e) => {
        state.agrupamentos.periodo = e.target.value;
        atualizarPainel();
    });

    document.getElementById('tipoGrafico').addEventListener('change', (e) => {
        state.agrupamentos.tipoGrafico = e.target.value;
        atualizarPainel();
    });

    // Botão Atualizar Filtros
    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
        atualizarPainelComSpinner();
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
    document.getElementById('btnAbrirFiltros')?.addEventListener('click', () => {
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.classList.add('ativo');
            document.body.style.overflow = 'hidden';
        }
    });

    document.getElementById('btnFecharFiltros')?.addEventListener('click', () => {
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.classList.remove('ativo');
            document.body.style.overflow = 'auto';
        }
    });

    document.getElementById('drawerOverlay')?.addEventListener('click', () => {
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.classList.remove('ativo');
            document.body.style.overflow = 'auto';
        }
    });

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
        const dataVenda = new Date(venda.data);
        const dataInicio = new Date(state.filtros.dataInicio);
        const dataFim = new Date(state.filtros.dataFim);

        const dentroData = dataVenda >= dataInicio && dataVenda <= dataFim;
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
            const dataStr = new Date(venda.data).toLocaleDateString('pt-BR');
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
        dataIni: state.filtros.dataInicio || '',
        dataFin: state.filtros.dataFim || ''
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
    const faturamento = vendas.reduce((sum, v) => sum + (v.valor_produto + v.valor_servico), 0);
    const devolucao = vendas.reduce((sum, v) => sum + v.devolucao, 0);
    const quantidade = vendas.reduce((sum, v) => sum + v.quantidade, 0);

    // Novo cálculo do ticket médio baseado no numPedidos da API
    const ticketMedio = state.numPedidos > 0 ? faturamento / state.numPedidos : 0;

    // Lógica de Projeção
    const valorTotal = faturamento + devolucao;
    const projecao = calcularProjecao(state.agrupamentos.periodo, state.filtros.dataFim, valorTotal);

    return { faturamento, ticketMedio, projecao, devolucao };
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
}

// ============================================================================
// AGRUPAMENTO DE DADOS
// ============================================================================

function agruparPorPeriodo(vendas, tipo) {
    const agrupado = {};
    vendas.forEach(venda => {
        const data = new Date(venda.data);
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (!agrupado[chave]) {
            agrupado[chave] = { valor_produto: 0, valor_servico: 0, custo: 0 };
        }
        agrupado[chave].valor_produto += venda.valor_produto;
        agrupado[chave].valor_servico += venda.valor_servico;
        agrupado[chave].custo += venda.custo;
    });

    const lista = Object.entries(agrupado).map(([periodo, dados]) => ({
        periodo,
        valor_produto: dados.valor_produto,
        valor_servico: dados.valor_servico,
        custo: dados.custo,
        valor_total: dados.valor_produto + dados.valor_servico
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
        const valorTotal = venda.valor_produto + venda.valor_servico;
        agrupado[chave] = (agrupado[chave] || 0) + valorTotal;
    });
    let resultado = Object.entries(agrupado).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);
    if (limite) resultado = resultado.slice(0, limite);
    return resultado;
}

function agruparClientesPorPeriodo(vendas, tipo) {
    const clientes = [...new Set(vendas.map(v => v.cliente))].sort();
    const agrupado = {};

    clientes.forEach(cliente => {
        agrupado[cliente] = {};
    });

    vendas.forEach(venda => {
        const data = new Date(venda.data);
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

        if (!agrupado[venda.cliente][chave]) {
            agrupado[venda.cliente][chave] = 0;
        }
        agrupado[venda.cliente][chave] += venda.valor;
    });

    return { clientes, dados: agrupado };
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
    
    if (isSeparado) {
        series.push({
            name: 'Produto',
            data: dados.map(d => d.valor_produto),
            color: '#3B82F6'
        });
        series.push({
            name: 'Serviço',
            data: dados.map(d => d.valor_servico),
            color: '#10B981'
        });
    } else {
        series.push({
            name: 'Faturamento',
            data: dados.map(d => d.valor_total),
            color: '#3B82F6'
        });
    }
    
    series.push({
        name: 'Custo',
        type: 'line',
        yAxis: 1,
        data: dados.map((d, idx) => ({
            y: d.custo,
            pct: faturamentoTotal > 0 ? (d.custo / faturamentoTotal * 100) : 0,
            index: idx
        })),
        color: '#EF4444',
        marker: { enabled: true, radius: 5 }
    });

    Highcharts.chart(containerId, {
        chart: { 
            type: 'column', 
            backgroundColor: 'transparent', 
            zIndex: 0,
            scrollablePlotArea: {
                minWidth: window.innerWidth < 768 ? 600 : 0,
                scrollPositionX: 0
            }
        },
        title: { text: null },
        xAxis: { categories: dados.map(d => d.periodo), crosshair: true },
        yAxis: [{
            title: { text: null },
            labels: { format: 'R$ {value:,.0f}' }
        }, {
            title: { text: null },
            labels: { format: '{value}%' },
            opposite: true
        }],
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
                    
                    if (point.series.name === 'Produto') {
                        html += 'Produto: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Serviço') {
                        html += 'Serviço: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Faturamento') {
                        html += 'Faturamento: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                        html += '&nbsp;&nbsp;• Produto: R$ ' + item.valor_produto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                        html += '&nbsp;&nbsp;• Serviço: R$ ' + item.valor_servico.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Custo') {
                        const pctCusto = faturamentoTotal > 0 ? (item.custo / faturamentoTotal * 100) : 0;
                        html += 'Custo: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' (' + pctCusto.toFixed(1) + '% do faturamento)<br>';
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
            column: {
                pointPadding: 0.2,
                borderWidth: 0,
                stacking: isSeparado ? 'normal' : undefined,
                dataLabels: {
                    enabled: false
                }
            },
            line: {
                dataLabels: {
                    enabled: true,
                    useHTML: true,
                    format: 'R$ {point.y:,.0f}<br/>{point.pct:.1f}%',
                    style: { textOutline: 'none', fontSize: '9px', fontWeight: 'bold', color: '#EF4444' }
                }
            }
        },
        series: series,
        credits: { enabled: false }
    });
}

function renderizarGraficoDimensao(containerId, dados, dimensao) {
    const cores = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#FBBF24', '#FCD34D', '#EF4444', '#F87171', '#FCA5A5'];

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
                    return `<b>${this.category}</b><br>Faturamento: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        format: 'R$ {point.y:,.0f}',
                        style: { fontSize: '12px', zIndex: 9999 },
                        zIndex: 9999
                    },
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: function () {
                                abrirModalCliente(this.category, dimensao);
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Faturamento',
                data: dados.map((d, i) => ({ y: d.valor, color: cores[i % cores.length] }))
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
                pointFormat: '<b>{point.name}</b>: R$ {point.y:,.2f} ({point.percentage:.1f}%)'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f}%',
                        style: { fontSize: '12px' }
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

    // Gráfico de Período no Modal
    renderizarGraficoPeriodo('chart-cliente-periodo', agruparPorPeriodo(vendas, state.agrupamentos.periodo));

    // Gráfico Total no Modal
    renderizarGraficoDimensao('chart-cliente-total', agruparPorDimensao(vendas, 'marca', 15), 'marca');
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
            <span class="projecao-detalhe-label">Faturamento Atual + Devolução:</span>
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
    const container = document.getElementById('tabela-vendas-body');
    if (container) container.innerHTML = '<tr><td colspan="15" style="text-align:center; padding: 2rem;">Carregando...</td></tr>';
    setTimeout(() => renderizarTabelaAnalitica(), 100);
}

function renderizarTabelaAnalitica(cliente = null, dimensao = null) {
    const vendas = filtrarVendas(true, cliente, dimensao);
    const tbody = document.getElementById('tabela-vendas-body');
    const tfoot = document.getElementById('tabela-vendas-footer');

    if (!tbody) return;

    tbody.innerHTML = vendas.map(v => `
        <tr>
            <td>${new Date(v.data).toLocaleDateString('pt-BR')}</td>
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
            <td class="numero">${formatarMoeda(v.valor_produto + v.valor_servico)}</td>
        </tr>
    `).join('');

    const totais = vendas.reduce((acc, v) => ({
        produto: acc.produto + v.valor_produto,
        servico: acc.servico + v.valor_servico,
        total: acc.total + (v.valor_produto + v.valor_servico)
    }), { produto: 0, servico: 0, total: 0 });

    tfoot.innerHTML = `
        <tr>
            <td colspan="13">TOTAIS (${vendas.length} registros)</td>
            <td class="numero">${formatarMoeda(totais.produto)}</td>
            <td class="numero">${formatarMoeda(totais.servico)}</td>
            <td class="numero">${formatarMoeda(totais.total)}</td>
        </tr>
    `;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    const data = vendas.map(v => ({
        'Data': new Date(v.data).toLocaleDateString('pt-BR'),
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
        'Valor Total': v.valor_produto + v.valor_servico
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "vendas_analitico.xlsx");
}
