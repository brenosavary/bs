/**
 * 
 * 19102026-1615
 *  
 * */  

(function () {
    function injetarComponentesUI() {
        if (document.getElementById('modalAnalitico')) {
            return; // Já injetado
        }

        // 1. Drawer de Filtros
        const containerDashboard = document.querySelector('.dashboard-content') || document.body;
        const mainContent = document.getElementById('mainContent');

        const htmlDrawer = `
        <div id="drawerFiltros" class="drawer-filtros">
            <div class="drawer-overlay" id="drawerOverlay" onclick="fecharFiltros()"></div>
            <div class="drawer-content">
                <div class="drawer-header">
                    <h3>Filtros</h3>
                    <button id="btnFecharFiltros" class="btn-fechar-filtros" onclick="fecharFiltros()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="filtros-panel">
                    <div class="filtro-grupo">
                        <label>Período de Vendas</label>
                        <div class="filtro-data">
                            <input type="date" id="dataInicio" value="2024-01-01">
                            <span>até</span>
                            <input type="date" id="dataFim" value="2025-12-31">
                        </div>
                        <button id="btnAplicarFiltros" class="btn-aplicar" style="margin-top: 1rem;">Atualizar Filtros</button>
                    </div>
                    <div class="filtro-grupo">
                        <label>Empresa</label>
                        <input type="text" class="filtro-busca" data-target="filtroEmpresa"
                            placeholder="Pesquisar empresa...">
                        <div class="chk-container" id="filtroEmpresa"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Marca</label>
                        <input type="text" class="filtro-busca" data-target="filtroMarca"
                            placeholder="Pesquisar marca...">
                        <div class="chk-container" id="filtroMarca"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Vendedor</label>
                        <input type="text" class="filtro-busca" data-target="filtroVendedor"
                            placeholder="Pesquisar vendedor...">
                        <div class="chk-container" id="filtroVendedor"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Grupo</label>
                        <input type="text" class="filtro-busca" data-target="filtroGrupo"
                            placeholder="Pesquisar grupo...">
                        <div class="chk-container" id="filtroGrupo"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Cliente</label>
                        <input type="text" class="filtro-busca" data-target="filtroCliente"
                            placeholder="Pesquisar cliente...">
                        <div class="chk-container" id="filtroCliente"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Região</label>
                        <input type="text" class="filtro-busca" data-target="filtroRegiao"
                            placeholder="Pesquisar região...">
                        <div class="chk-container" id="filtroRegiao"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Cidade</label>
                        <input type="text" class="filtro-busca" data-target="filtroCidade"
                            placeholder="Pesquisar cidade...">
                        <div class="chk-container" id="filtroCidade"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Rota</label>
                        <input type="text" class="filtro-busca" data-target="filtroRota"
                            placeholder="Pesquisar rota...">
                        <div class="chk-container" id="filtroRota"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Estado</label>
                        <input type="text" class="filtro-busca" data-target="filtroEstado"
                            placeholder="Pesquisar estado...">
                        <div class="chk-container" id="filtroEstado"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Prazo de Pagamento</label>
                        <input type="text" class="filtro-busca" data-target="filtroTipoPagamento"
                            placeholder="Pesquisar prazo de pagamento...">
                        <div class="chk-container" id="filtroTipoPagamento"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Tipo de Pagamento</label>
                        <input type="text" class="filtro-busca" data-target="filtroPrazoPagamento"
                            placeholder="Pesquisar tipo de pagamento...">
                        <div class="chk-container" id="filtroPrazoPagamento"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Tipo de Documento</label>
                        <input type="text" class="filtro-busca" data-target="filtroTipoDocumento"
                            placeholder="Pesquisar tipo de documento...">
                        <div class="chk-container" id="filtroTipoDocumento"></div>
                    </div>
                    <div class="filtro-grupo">
                        <label>Status do Documento</label>
                        <input type="text" class="filtro-busca" data-target="filtroStatusDocumento"
                            placeholder="Pesquisar status do documento...">
                        <div class="chk-container" id="filtroStatusDocumento"></div>
                    </div>
                </div>
                <div class="drawer-footer" style="display: none;"></div>
            </div>
        </div>`;

        if (mainContent && mainContent.parentNode === containerDashboard) {
            mainContent.insertAdjacentHTML('beforebegin', htmlDrawer);
        } else {
            containerDashboard.insertAdjacentHTML('afterbegin', htmlDrawer);
        }

        // 2. Modais (Metas, Cliente e Analítico)
        const htmlModais = `
        <!-- Modal Detalhes das Metas -->
        <div id="modalProjecao" class="modal">
            <div class="modal-overlay"></div>
            <div class="modal-content modal-small">
                <div class="modal-header">
                    <h3>Detalhes das Metas</h3>
                    <button id="btnFecharModalProjecao" class="btn-fechar-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="detalhes-projecao-content">
                        <!-- Conteúdo preenchido via JS -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Cliente -->
        <div id="modalCliente" class="modal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <h3 id="modal-titulo" style="margin: 0;">Análise do Cliente</h3>
                        <div class="modal-filters" style="display: flex; align-items: center; gap: 0.8rem;">
                            <div class="control-grupo" style="display: flex; align-items: center; gap: 0.5rem;">
                                <label style="font-size: 0.75rem; font-weight: 600; white-space: nowrap;">Fat. Mínimo:</label>
                                <input type="number" id="filtroValorMinimoCliente" value="0" step="100"
                                    style="padding: 0.2rem 0.4rem; border: 1px solid var(--border); border-radius: var(--radius); width: 100px; font-size: 0.85rem;">
                            </div>
                            <button id="btnAplicarFiltroModal" class="btn-aplicar"
                                style="width: auto; padding: 0.2rem 0.8rem; font-size: 0.85rem; background-color: var(--primary-color); color: white; border: none; border-radius: var(--radius); cursor: pointer;">Atualizar Filtro</button>
                        </div>
                    </div>
                    <div class="modal-header-buttons">
                        <button id="btnVerAnaliticoCliente" class="btn-analitico-modal">📊 Ver Analítico</button>
                        <button id="btnFecharModalCliente" class="btn-fechar-modal">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div id="chart-cliente-periodo" class="chart-placeholder"></div>
                    <div id="chart-cliente-periodo-aviso" class="chart-aviso" hidden></div>
                    <div id="chart-cliente-total" class="chart-placeholder" style="margin-top: 2rem;"></div>
                </div>
            </div>
        </div>

        <!-- Modal Analítico (Planilha) -->
        <div id="modalAnalitico" class="modal">
            <div class="modal-overlay"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3 id="modalAnaliticoTitulo">Detalhamento Analítico</h3>
                    <button id="btnFecharModalAnalitico" class="btn-fechar-modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="tabela-container">
                        <div class="tabela-header">
                            <h3 id="info-filtros-analitico">Vendas Filtradas</h3>
                            <div class="tabela-header-actions">
                                <button id="btnAtualizarAnalitico" class="btn-atualizar-analitico">🔄 Atualizar Filtros</button>
                                <button id="btnExportar" class="btn-exportar">Exportar para Excel</button>
                            </div>
                        </div>
                        <table class="tabela-vendas">
                            <thead>
                                <tr>
                                    <th>Data <input type="text" class="col-filter" data-col="data" placeholder="Filtrar..."></th>
                                    <th>Nº Pedido <input type="text" class="col-filter" data-col="numero_pedido" placeholder="Filtrar..."></th>
                                    <th>Empresa <input type="text" class="col-filter" data-col="empresa" placeholder="Filtrar..."></th>
                                    <th>Marca <input type="text" class="col-filter" data-col="marca" placeholder="Filtrar..."></th>
                                    <th>Vendedor <input type="text" class="col-filter" data-col="vendedor" placeholder="Filtrar..."></th>
                                    <th>Grupo <input type="text" class="col-filter" data-col="grupo" placeholder="Filtrar..."></th>
                                    <th>Cliente <input type="text" class="col-filter" data-col="cliente" placeholder="Filtrar..."></th>
                                    <th>Região <input type="text" class="col-filter" data-col="regiao" placeholder="Filtrar..."></th>
                                    <th>Cidade <input type="text" class="col-filter" data-col="cidade" placeholder="Filtrar..."></th>
                                    <th>Rota <input type="text" class="col-filter" data-col="rota" placeholder="Filtrar..."></th>
                                    <th>Estado <input type="text" class="col-filter" data-col="estado" placeholder="Filtrar..."></th>
                                    <th>Prazo Pagto <input type="text" class="col-filter" data-col="tipo_pagamento" placeholder="Filtrar..."></th>
                                    <th>T. Pagto <input type="text" class="col-filter" data-col="prazo_pagamento" placeholder="Filtrar..."></th>
                                    <th>T. Doc <input type="text" class="col-filter" data-col="tipo_documento" placeholder="Filtrar..."></th>
                                    <th>Status <input type="text" class="col-filter" data-col="status_documento" placeholder="Filtrar..."></th>
                                    <th>Valor Produto</th>
                                    <th>Valor Serviço</th>
                                    <th>Valor</th>
                                    <th>Devolução</th>
                                    <th>Custo</th>
                                </tr>
                            </thead>
                            <tbody id="tabelaVendas"></tbody>
                            <tfoot id="tabelaVendasFooter"></tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', htmlModais);
    }

    // Executa a injeção imediatamente se o DOM já estiver pronto para o body,
    // ou escuta o evento DOMContentLoaded
    if (document.body) {
        injetarComponentesUI();
    } else {
        document.addEventListener('DOMContentLoaded', injetarComponentesUI);
    }
})();
