document.addEventListener('DOMContentLoaded', () => {
    // Mapeia os elementos HTML para constantes para fácil acesso.
    const numVariaveisInput = document.getElementById('numVariaveis');
    const btnIncrement = document.getElementById('btn-increment');
    const btnDecrement = document.getElementById('btn-decrement');
    const tabelaContainer = document.getElementById('tabela-container');
    const kmapContainer = document.getElementById('kmap-container');
    const expressionElement = document.getElementById('simplified-expression');
    const mainView = document.getElementById('main-view');
    const mapView = document.getElementById('map-view');
    const btnGerarMapa = document.getElementById('btn-gerar-mapa');
    const btnVoltar = document.getElementById('btn-voltar');
    const btnCopiarExpressao = document.getElementById('btn-copiar-expressao');
    const btnSalvarJPG = document.getElementById('btn-salvar-jpg');

    // Define constantes globais para a aplicação.
    const estadosSaida = ['0', '1', 'X']; // Valores possíveis para a saída da tabela verdade.
    const VAR_NAMES = ['A', 'B', 'C', 'D', 'E', 'F']; // Nomes das variáveis.
    const GROUP_COLORS = ['#f44336', '#2196f3', '#4caf50', '#ffc107', '#9c27b0', '#e91e63', '#00bcd4', '#ff5722']; // Cores para os grupos no Mapa de Karnaugh.

    /**
     * Alterna a visibilidade entre a tela da tabela verdade e a tela do mapa.
     * @param {HTMLElement} viewToShow - O container da tela que deve ser exibido.
     */
    const switchView = (viewToShow) => {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        viewToShow.classList.add('active');
    };
    
    /**
     * Função principal que orquestra a geração e exibição do Mapa de Karnaugh.
     * Lê os valores da tabela, gera as estruturas de dados, desenha o mapa,
     * executa a simplificação e exibe o resultado.
     */
    const gerarMapaEExibir = () => {
        const numVariaveis = parseInt(numVariaveisInput.value);
        const truthTableValues = lerValoresTabela();
        const { kmapMatrices, gridConfig } = gerarMatrizesKmap(numVariaveis, truthTableValues);
        
        desenharMapaK(numVariaveis, kmapMatrices, gridConfig);
        
        try {
            const { finalGroups, expression } = simplificar(numVariaveis, kmapMatrices);

            // Limpa o conteúdo anterior e prepara para receber o HTML.
            expressionElement.innerHTML = 'S = '; 

            // Trata os casos onde a expressão é um valor constante (0 ou 1) ou não há grupos.
            if (expression === "0" || expression === "1" || !finalGroups || finalGroups.length === 0) {
                expressionElement.innerHTML += (expression || '0');
            } else {
                // Mapeia cada grupo final para um <span> colorido.
                const termosColoridosHTML = finalGroups.map((group, i) => {
                    const termo = getTermForGroup(numVariaveis, group);
                    const cor = GROUP_COLORS[i % GROUP_COLORS.length];
                    return `<span style="color: ${cor}; font-weight: 700;">${termo}</span>`;
                }).join(' + '); // Junta os termos com o operador '+'.

                expressionElement.innerHTML += termosColoridosHTML;
            }
            desenharGrupos(finalGroups, gridConfig);
        } catch (e) {
            console.error("Erro durante a simplificação:", e);
            expressionElement.textContent = "S = Erro na simplificação";
        }
        
        switchView(mapView);
    };

    /**
     * Gera e renderiza a tabela verdade no HTML com base no número de variáveis selecionado.
     */
    function gerarTabelaVerdade() {
        const numVars = parseInt(numVariaveisInput.value);
        tabelaContainer.innerHTML = '';
        const numLinhas = Math.pow(2, numVars);
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    ${VAR_NAMES.slice(0, numVars).map(v => `<th>${v}</th>`).join('')}
                    <th>S</th>
                </tr>
            </thead>
            <tbody>
                ${Array.from({ length: numLinhas }, (_, i) => `
                    <tr>
                        ${i.toString(2).padStart(numVars, '0').split('').map(bit => `<td>${bit}</td>`).join('')}
                        <td class="output-cell" data-current-state="0">0</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        // Adiciona um evento de clique a cada célula de saída para alternar entre '0', '1' e 'X'.
        table.querySelectorAll('.output-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                let currentStateIndex = (parseInt(cell.dataset.currentState) + 1) % estadosSaida.length;
                cell.textContent = estadosSaida[currentStateIndex];
                cell.dataset.currentState = currentStateIndex;
                cell.classList.toggle('x-value', cell.textContent === 'X');
                cell.classList.toggle('one-value', cell.textContent === '1');
            });
        });
        tabelaContainer.appendChild(table);
    }

    /**
     * Lê os valores de saída da tabela verdade no HTML e retorna como um array.
     * @returns {string[]} Um array com os valores '0', '1' ou 'X'.
     */
    function lerValoresTabela() {
        return Array.from(document.querySelectorAll('.output-cell')).map(cell => cell.textContent);
    }

    /**
     * Retorna a configuração de grid (linhas, colunas, etc.) para o Mapa de Karnaugh
     * com base no número de variáveis.
     * @param {number} numVars - O número de variáveis.
     * @returns {object} Objeto com a configuração do grid.
     */
    function getKmapGridConfig(numVars) {
        if (numVars === 2) return { rows: 2, cols: 2, numSubGrids: 1, varsLeft: ['A'], varsTop: ['B'] };
        if (numVars === 3) return { rows: 2, cols: 4, numSubGrids: 1, varsLeft: ['A'], varsTop: ['B', 'C'] };
        if (numVars === 4) return { rows: 4, cols: 4, numSubGrids: 1, varsLeft: ['A', 'B'], varsTop: ['C', 'D'] };
        if (numVars === 5) return { rows: 4, cols: 4, numSubGrids: 2, varsSub: ['A'], varsLeft: ['B', 'C'], varsTop: ['D', 'E'] };
        if (numVars === 6) return { rows: 4, cols: 4, numSubGrids: 4, varsSub: ['A', 'B'], varsLeft: ['C', 'D'], varsTop: ['E', 'F'] };
        return {};
    }

    /**
     * Converte um índice da tabela verdade para sua posição correspondente no Mapa de Karnaugh (grid, linha, coluna).
     * Utiliza o código de Gray para o mapeamento correto.
     * @param {number} index - O índice da linha na tabela verdade.
     * @param {number} numVars - O número de variáveis.
     * @returns {{grid: number, row: number, col: number}} A posição no mapa.
     */
    function ttIndexToKmapPos(index, numVars) {
        const bin = index.toString(2).padStart(numVars, '0');
        const grayCode = [0, 1, 3, 2]; // Código de Gray para 2 bits
        let row, col, grid = 0;
        
        switch (numVars) {
            case 2:
                row = parseInt(bin[0], 2);
                col = parseInt(bin[1], 2);
                break;
            case 3:
                row = parseInt(bin[0], 2);
                col = grayCode.indexOf(parseInt(bin.substring(1, 3), 2));
                break;
            case 4:
                row = grayCode.indexOf(parseInt(bin.substring(0, 2), 2));
                col = grayCode.indexOf(parseInt(bin.substring(2, 4), 2));
                break;
            case 5:
                grid = parseInt(bin[0], 2);
                row = grayCode.indexOf(parseInt(bin.substring(1, 3), 2));
                col = grayCode.indexOf(parseInt(bin.substring(3, 5), 2));
                break;
            case 6:
                const subGridVal = parseInt(bin.substring(0, 2), 2);
                grid = grayCode.indexOf(subGridVal);
                row = grayCode.indexOf(parseInt(bin.substring(2, 4), 2));
                col = grayCode.indexOf(parseInt(bin.substring(4, 6), 2));
                break;
        }
        return { grid, row, col };
    }
    
    /**
     * Converte uma posição no Mapa de Karnaugh (grid, linha, coluna) de volta para o índice da tabela verdade.
     * @param {{grid: number, row: number, col: number}} pos - A posição no mapa.
     * @param {number} numVars - O número de variáveis.
     * @returns {number} O índice da linha na tabela verdade.
     */
    function kmapPosToTTIndex(pos, numVars) {
        let bin = '';
        const grayCode = [0, 1, 3, 2];
        
        switch (numVars) {
            case 2:
                bin = `${pos.row.toString(2)}${pos.col.toString(2)}`;
                break;
            case 3:
                const rowVal3 = pos.row.toString(2);
                const colVal3 = grayCode[pos.col].toString(2).padStart(2, '0');
                bin = `${rowVal3}${colVal3}`;
                break;
            case 4:
                const rowVal4 = grayCode[pos.row].toString(2).padStart(2, '0');
                const colVal4 = grayCode[pos.col].toString(2).padStart(2, '0');
                bin = `${rowVal4}${colVal4}`;
                break;
            case 5:
                const gridVal5 = pos.grid.toString(2);
                const rowVal5 = grayCode[pos.row].toString(2).padStart(2, '0');
                const colVal5 = grayCode[pos.col].toString(2).padStart(2, '0');
                bin = `${gridVal5}${rowVal5}${colVal5}`;
                break;
            case 6:
                const gridBinaryValue = grayCode[pos.grid];
                const gridVal6 = gridBinaryValue.toString(2).padStart(2, '0');
                const rowVal6 = grayCode[pos.row].toString(2).padStart(2, '0');
                const colVal6 = grayCode[pos.col].toString(2).padStart(2, '0');
                bin = `${gridVal6}${rowVal6}${colVal6}`;
                break;
        }
        return parseInt(bin, 2);
    }

    /**
     * Cria as matrizes que representam o Mapa de Karnaugh a partir dos valores da tabela verdade.
     * @param {number} numVars - O número de variáveis.
     * @param {string[]} values - Array de valores de saída da tabela verdade.
     * @returns {{kmapMatrices: Array<Array<string[]>>, gridConfig: object}} As matrizes do mapa e sua configuração.
     */
    function gerarMatrizesKmap(numVars, values) {
        const gridConfig = getKmapGridConfig(numVars);
        if (!gridConfig.rows) return { kmapMatrices: [], gridConfig: {} };
        
        const kmapMatrices = Array.from({ length: gridConfig.numSubGrids }, () =>
            Array(gridConfig.rows).fill(null).map(() => Array(gridConfig.cols).fill(null))
        );
        
        values.forEach((val, index) => {
            const pos = ttIndexToKmapPos(index, numVars);
            if (kmapMatrices[pos.grid]?.[pos.row] !== undefined) {
                kmapMatrices[pos.grid][pos.row][pos.col] = val;
            }
        });
        
        return { kmapMatrices, gridConfig };
    }

    /**
     * Desenha a estrutura visual do Mapa de Karnaugh (grids, cabeçalhos e células) no HTML.
     * @param {number} numVars - O número de variáveis.
     * @param {Array<Array<string[]>>} kmapMatrices - As matrizes de dados do mapa.
     * @param {object} gridConfig - A configuração de layout do mapa.
     */
    function desenharMapaK(numVars, kmapMatrices, gridConfig) {
        kmapContainer.innerHTML = '';
        if (!gridConfig.rows) return;

        const mainWrapper = document.createElement('div');
        kmapContainer.appendChild(mainWrapper);

        // Função auxiliar para construir um sub-grid individual do mapa.
        const buildMapGrid = (matrix, gridIndex, vars) => {
            const { varsLeft, varsTop } = vars;
            const hasSplitLeft = varsLeft.length > 1;
            const hasSplitTop = varsTop.length > 1;

            const leftHeaderCols = varsLeft.length > 0 ? 1 : 0;
            const rightHeaderCols = hasSplitLeft ? 1 : 0;
            const headerRows = varsTop.length > 0 ? 1 : 0;
            
            const totalRows = headerRows + gridConfig.rows + (hasSplitTop ? 1 : 0);
            const totalCols = leftHeaderCols + gridConfig.cols + rightHeaderCols;

            const mapContainer = document.createElement('div');
            mapContainer.className = 'kmap-sub-grid-container';
            const kmap = document.createElement('div');
            kmap.className = 'kmap';
            kmap.id = `kmap-grid-${gridIndex}`;
            kmap.style.display = 'grid';
            kmap.style.gridTemplateRows = `repeat(${totalRows}, auto)`;
            kmap.style.gridTemplateColumns = `repeat(${totalCols}, auto)`;
            
            // Adiciona cabeçalhos (nomes das variáveis) ao redor do grid.
            const corner = document.createElement('div');
            corner.style.gridArea = `1 / 1 / ${headerRows + 1} / ${leftHeaderCols + 1}`;
            kmap.appendChild(corner);
            
            if (varsTop.length > 0) {
                const mainVar = varsTop[0];
                const labels = [`${mainVar}'`, mainVar];
                const colSpan = gridConfig.cols / labels.length;
                labels.forEach((label, i) => {
                    const h = document.createElement('div');
                    h.className = 'kmap-header'; h.textContent = label;
                    h.style.gridArea = `1 / ${leftHeaderCols + 1 + (i * colSpan)} / 2 / ${leftHeaderCols + 1 + (i * colSpan) + colSpan}`;
                    kmap.appendChild(h);
                });
            }
            
            if (hasSplitTop) {
                const subVar = varsTop[1];
                const subLabels = [`${subVar}'`, subVar, subVar, `${subVar}'`];
                const bottomRowGridStart = headerRows + gridConfig.rows + 1;
                subLabels.forEach((label, i) => {
                     const h = document.createElement('div');
                     h.className = 'kmap-header'; h.textContent = label;
                     h.style.gridArea = `${bottomRowGridStart} / ${leftHeaderCols + 1 + i} / ${bottomRowGridStart + 1} / ${leftHeaderCols + 2 + i}`;
                     kmap.appendChild(h);
                });
            }

            if (varsLeft.length > 0) {
                const mainVar = varsLeft[0];
                const labels = [`${mainVar}'`, mainVar];
                const rowSpan = gridConfig.rows / labels.length;
                labels.forEach((label, i) => {
                    const h = document.createElement('div');
                    h.className = 'kmap-header'; h.textContent = label;
                    h.style.gridArea = `${headerRows + 1 + (i * rowSpan)} / 1 / ${headerRows + 1 + (i * rowSpan) + rowSpan} / 2`;
                    kmap.appendChild(h);
                });
            }

            if (hasSplitLeft) {
                const subVar = varsLeft[1];
                const subLabels = [`${subVar}'`, subVar, subVar, `${subVar}'`];
                const rightHeaderColStart = leftHeaderCols + gridConfig.cols + 1;
                subLabels.forEach((label, r) => {
                    const h = document.createElement('div');
                    h.className = 'kmap-header'; h.textContent = label;
                    h.style.gridArea = `${headerRows + 1 + r} / ${rightHeaderColStart} / ${headerRows + 2 + r} / ${rightHeaderColStart + 1}`;
                    kmap.appendChild(h);
                });
            }

            // Preenche as células do mapa com os valores 0, 1 ou X.
            matrix.forEach((rowData, r) => {
                rowData.forEach((cellData, c) => {
                    const cell = document.createElement('div');
                    cell.className = 'kmap-cell';
                    if (cellData === 'X') cell.classList.add('x-value');
                    if (cellData === '1') cell.classList.add('one-value');
                    cell.textContent = cellData;
                    cell.style.gridArea = `${headerRows + 1 + r} / ${leftHeaderCols + 1 + c} / ${headerRows + 2 + r} / ${leftHeaderCols + 2 + c}`;
                    kmap.appendChild(cell);
                });
            });

            mapContainer.appendChild(kmap);
            return mapContainer;
        };

        // Organiza os sub-grids dependendo do número de variáveis.
        if (numVars <= 5) {
            if (numVars <= 4) {
                 mainWrapper.appendChild(buildMapGrid(kmapMatrices[0], 0, gridConfig));
            } else { // 5 variáveis
                mainWrapper.style.display = 'flex';
                mainWrapper.style.alignItems = 'center';
                mainWrapper.style.gap = '20px';
                const divA0 = document.createElement('div');
                const divA1 = document.createElement('div');
                divA0.innerHTML = `<h3>${gridConfig.varsSub[0]}'</h3>`;
                divA1.innerHTML = `<h3>${gridConfig.varsSub[0]}</h3>`;
                divA0.appendChild(buildMapGrid(kmapMatrices[0], 0, { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop }));
                divA1.appendChild(buildMapGrid(kmapMatrices[1], 1, { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop }));
                mainWrapper.append(divA0, divA1);
            }
        } else if (numVars === 6) { // 6 variáveis
            mainWrapper.style.display = 'grid';
            mainWrapper.style.gridTemplateColumns = 'auto auto auto';
            mainWrapper.style.gridTemplateRows = 'auto auto auto';
            mainWrapper.style.gap = '5px 15px';
            mainWrapper.style.alignItems = 'center';
            mainWrapper.style.justifyItems = 'center';

            const mainGridVarV = gridConfig.varsSub[0];
            const mainGridVarH = gridConfig.varsSub[1];

            const corner = document.createElement('div');
            corner.style.gridArea = '1 / 1';
            mainWrapper.appendChild(corner);

            const topLabels = [`${mainGridVarH}'`, mainGridVarH];
            topLabels.forEach((label, i) => {
                const h = document.createElement('div');
                h.className = 'kmap-header'; h.textContent = label;
                h.style.gridArea = `1 / ${2 + i}`;
                mainWrapper.appendChild(h);
            });

            const leftLabels = [`${mainGridVarV}'`, mainGridVarV];
            leftLabels.forEach((label, i) => {
                const h = document.createElement('div');
                h.className = 'kmap-header'; h.textContent = label;
                h.style.padding = '10px';
                h.style.gridArea = `${2 + i} / 1`;
                mainWrapper.appendChild(h);
            });

            const subGridConfig = { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop };
            const placement = { '0': '2 / 2', '1': '2 / 3', '3': '3 / 2', '2': '3 / 3' }; // Posições dos sub-grids usando Gray Code

            kmapMatrices.forEach((matrix, index) => {
                const map = buildMapGrid(matrix, index, subGridConfig);
                map.style.gridArea = placement[index];
                mainWrapper.appendChild(map);
            });
        }
    }
    
    /**
     * Desenha os retângulos coloridos sobre o Mapa de Karnaugh para visualizar os grupos simplificados.
     * Esta versão usa margens para "aninhar" as bordas de grupos sobrepostos.
     * @param {Array<number[]>} groups - Array de grupos, onde cada grupo é um array de mintermos.
     * @param {object} gridConfig - A configuração de layout do mapa.
     */
    function desenharGrupos(groups, gridConfig) {
        document.querySelectorAll('.kmap-group').forEach(el => el.remove());
        const { rows, cols } = gridConfig;
        const BORDER_WIDTH = 4; // Largura da borda em pixels, para o cálculo da margem.

        // Função auxiliar para desenhar um retângulo específico de um grupo.
        // Adicionamos o 'groupIndex' para calcular o recuo da margem.
        const drawRect = (rect, color, groupIndex) => {
            const kmapGrid = document.getElementById(`kmap-grid-${rect.grid}`);
            if (!kmapGrid) return;
            
            const numVariaveis = parseInt(numVariaveisInput.value);
            const subGridConfig = (numVariaveis <= 4) ? gridConfig : { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop };
            const leftHeaderCols = subGridConfig.varsLeft.length > 0 ? 1 : 0;
            const topHeaderRows = subGridConfig.varsTop.length > 0 ? 1 : 0;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'kmap-group';
            groupDiv.style.borderColor = color;

            // Calcula a margem com base no índice do grupo.
            // O primeiro grupo (índice 0) tem margem 0.
            // O segundo (índice 1) tem margem de 4px, e assim por diante.
            const marginSize = groupIndex * BORDER_WIDTH;
            groupDiv.style.margin = `${marginSize}px`;
            
            groupDiv.style.borderWidth = `${BORDER_WIDTH}px`;

            const rowStart = topHeaderRows + rect.r + 1;
            const colStart = leftHeaderCols + rect.c + 1;
            const rowEnd = rowStart + rect.h;
            const colEnd = colStart + rect.w;

            groupDiv.style.gridArea = `${rowStart} / ${colStart} / ${rowEnd} / ${colEnd}`;
            kmapGrid.appendChild(groupDiv);
        };

        // Itera sobre cada grupo final da simplificação.
        groups.forEach((group, i) => {
            const color = GROUP_COLORS[i % GROUP_COLORS.length];
            const numVars = parseInt(numVariaveisInput.value);
            
            const groupPos = group.map(ttIndex => ttIndexToKmapPos(ttIndex, numVars));
            
            const groupCellsByGrid = {};
            groupPos.forEach(pos => {
                if (!groupCellsByGrid[pos.grid]) groupCellsByGrid[pos.grid] = [];
                groupCellsByGrid[pos.grid].push(pos);
            });
            
            for (const grid in groupCellsByGrid) {
                const rects = findRectanglesForDrawing(groupCellsByGrid[grid], rows, cols);
                // Passamos o índice do grupo 'i' para a função drawRect.
                rects.forEach(r => drawRect({ ...r, grid: parseInt(grid) }, color, i));
            }
        });
    }

    /**
     * Algoritmo auxiliar para encontrar os retângulos que representam um grupo de células,
     * lidando com a adjacência circular (wrap-around) do mapa.
     * @param {object[]} cells - Células pertencentes a um grupo em um único grid.
     * @param {number} maxRow - Número de linhas no grid.
     * @param {number} maxCol - Número de colunas no grid.
     * @returns {object[]} Um array de objetos representando os retângulos a serem desenhados.
     */
    function findRectanglesForDrawing(cells, maxRow, maxCol) {
        if (cells.length === 0) return [];
        
        const visited = new Set();
        const rectangles = [];
        const cellSet = new Set(cells.map(c => `${c.row}-${c.col}`));
        
        cells.sort((a, b) => a.row - b.row || a.col - b.col);
        
        cells.forEach(startCell => {
            const key = `${startCell.row}-${startCell.col}`;
            if (visited.has(key)) return;
            
            // Tenta encontrar o maior retângulo possível (potências de 2) a partir da célula atual.
            const possibleSizes = [
                {w: 4, h: 4}, {w: 4, h: 2}, {w: 2, h: 4},
                {w: 4, h: 1}, {w: 1, h: 4}, {w: 2, h: 2},
                {w: 2, h: 1}, {w: 1, h: 2}, {w: 1, h: 1}
            ];
            
            for (const size of possibleSizes) {
                if (canFormRectangle(startCell, size, cellSet, maxRow, maxCol, visited)) {
                    const rect = createRectangle(startCell, size, maxRow, maxCol, visited);
                    rectangles.push(...rect);
                    break;
                }
            }
        });
        
        return rectangles;
    }

    /**
     * Verifica se é possível formar um retângulo de um determinado tamanho a partir de uma célula inicial.
     */
    function canFormRectangle(startCell, size, cellSet, maxRow, maxCol, visited) {
        for (let r = 0; r < size.h; r++) {
            for (let c = 0; c < size.w; c++) {
                const row = (startCell.row + r) % maxRow;
                const col = (startCell.col + c) % maxCol;
                const key = `${row}-${col}`;
                if (!cellSet.has(key) || visited.has(key)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Cria os objetos de retângulo, dividindo-os se houver adjacência circular (wrap-around).
     */
    function createRectangle(startCell, size, maxRow, maxCol, visited) {
        const rectangles = [];
        
        // Marca as células do retângulo como visitadas.
        for (let r = 0; r < size.h; r++) {
            for (let c = 0; c < size.w; c++) {
                const row = (startCell.row + r) % maxRow;
                const col = (startCell.col + c) % maxCol;
                visited.add(`${row}-${col}`);
            }
        }
        
        // Verifica e trata a adjacência circular.
        if (startCell.col + size.w > maxCol) { // Quebra horizontal
            const w1 = maxCol - startCell.col;
            const w2 = size.w - w1;
            rectangles.push({ r: startCell.row, c: startCell.col, w: w1, h: size.h });
            rectangles.push({ r: startCell.row, c: 0, w: w2, h: size.h });
        } else if (startCell.row + size.h > maxRow) { // Quebra vertical
            const h1 = maxRow - startCell.row;
            const h2 = size.h - h1;
            rectangles.push({ r: startCell.row, c: startCell.col, w: size.w, h: h1 });
            rectangles.push({ r: 0, c: startCell.col, w: size.w, h: h2 });
        } else { // Retângulo simples, sem quebra.
            rectangles.push({ r: startCell.row, c: startCell.col, w: size.w, h: size.h });
        }
        
        return rectangles;
    }

    /**
     * Executa o algoritmo de simplificação de Quine-McCluskey.
     * @param {number} numVars - O número de variáveis.
     * @param {Array<Array<string[]>>} matrices - Matrizes de dados do mapa.
     * @returns {{finalGroups: Array<number[]>, expression: string}} Os grupos finais e a expressão simplificada.
     */
    function simplificar(numVars, matrices) {
        const minterms = [], dontCares = [];
        
        // Extrai mintermos ('1') e don't cares ('X') das matrizes.
        matrices.forEach((matrix, grid) => {
            matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val === '1' || val === 'X') {
                        const ttIndex = kmapPosToTTIndex({ grid, row: r, col: c }, numVars);
                        if (val === '1') minterms.push(ttIndex);
                        if (val === 'X') dontCares.push(ttIndex);
                    }
                });
            });
        });

        if (minterms.length === 0) return { expression: "0", finalGroups: [] };
        
        // Se todos os valores forem '1' ou 'X', a expressão é '1'.
        const allPossibleMinterms = Math.pow(2, numVars);
        const allTerms = [...minterms, ...dontCares];
        if (allTerms.length === allPossibleMinterms) {
            return { expression: "1", finalGroups: [Array.from({length: allPossibleMinterms}, (_, i) => i)] };
        }

        // Encontra todos os implicantes primos.
        const primeImplicants = findPrimeImplicants(numVars, [...minterms, ...dontCares]);
        
        // Seleciona um conjunto mínimo de implicantes para cobrir todos os mintermos.
        const finalGroups = selectMinimalCover(primeImplicants, minterms);

        const expression = finalGroups
            .map(group => getTermForGroup(numVars, group))
            .filter(Boolean)
            .join(' + ');
            
        return { finalGroups, expression };
    }

    /**
     * Encontra todos os implicantes primos usando o método de Quine-McCluskey.
     * @param {number} numVars - O número de variáveis.
     * @param {number[]} terms - Um array de mintermos e don't cares.
     * @returns {Array<number[]>} Um array de implicantes primos.
     */
    function findPrimeImplicants(numVars, terms) {
        if (terms.length === 0) return [];
        
        // Agrupa os termos pelo número de '1's em sua representação binária.
        let currentLevel = new Map();
        terms.forEach(term => {
            const ones = term.toString(2).split('1').length - 1;
            if (!currentLevel.has(ones)) currentLevel.set(ones, []);
            currentLevel.get(ones).push({ term, mask: 0 });
        });
        
        const primeImplicants = [];
        
        // Combina iterativamente os termos para encontrar implicantes.
        while (currentLevel.size > 0) {
            const nextLevel = new Map();
            const combined = new Set();
            
            // Tenta combinar termos de grupos adjacentes (que diferem por um '1').
            for (let ones = 0; ones < numVars; ones++) {
                const group1 = currentLevel.get(ones) || [];
                const group2 = currentLevel.get(ones + 1) || [];
                
                group1.forEach((item1, i1) => {
                    group2.forEach((item2, i2) => {
                        if (canCombineItems(item1, item2)) {
                            const newItem = combineItems(item1, item2);
                            const newOnes = countOnesInItem(newItem, numVars);
                            if (!nextLevel.has(newOnes)) nextLevel.set(newOnes, []);
                            
                            const exists = nextLevel.get(newOnes).some(existing => existing.term === newItem.term && existing.mask === newItem.mask);
                            if (!exists) nextLevel.get(newOnes).push(newItem);
                            
                            combined.add(`${ones}-${i1}`);
                            combined.add(`${ones + 1}-${i2}`);
                        }
                    });
                });
            }
            
            // Termos que não puderam ser combinados são implicantes primos.
            for (let ones = 0; ones <= numVars; ones++) {
                const group = currentLevel.get(ones) || [];
                group.forEach((item, index) => {
                    if (!combined.has(`${ones}-${index}`)) {
                        primeImplicants.push(expandImplicant(item, numVars));
                    }
                });
            }
            
            currentLevel = nextLevel;
        }
        
        return primeImplicants;
    }

    /** Funções auxiliares para `findPrimeImplicants` */
    function canCombineItems(item1, item2) {
        const diff = item1.term ^ item2.term;
        return item1.mask === item2.mask && diff > 0 && (diff & (diff - 1)) === 0;
    }

    function combineItems(item1, item2) {
        return { term: item1.term & item2.term, mask: item1.mask | (item1.term ^ item2.term) };
    }



    function countOnesInItem(item, numVars) {
        let count = 0;
        for (let i = 0; i < numVars; i++) {
            if (!(item.mask & (1 << i)) && (item.term & (1 << i))) count++;
        }
        return count;
    }

    function expandImplicant(item, numVars) {
        const terms = [];
        const dontCareBits = [];
        for (let i = 0; i < numVars; i++) {
            if (item.mask & (1 << i)) dontCareBits.push(i);
        }
        const numCombinations = 1 << dontCareBits.length;
        for (let i = 0; i < numCombinations; i++) {
            let newTerm = item.term;
            for (let j = 0; j < dontCareBits.length; j++) {
                if (i & (1 << j)) newTerm |= (1 << dontCareBits[j]);
            }
            terms.push(newTerm);
        }
        return terms.sort((a, b) => a - b);
    }

    /**
     * Seleciona um conjunto mínimo de implicantes primos que cobrem todos os mintermos essenciais.
     * Utiliza a técnica da "tabela de implicantes primos".
     * @param {Array<number[]>} primeImplicants - Todos os implicantes primos encontrados.
     * @param {number[]} minterms - Os mintermos que precisam ser cobertos.
     * @returns {Array<number[]>} Um conjunto mínimo de implicantes (grupos).
     */
    function selectMinimalCover(primeImplicants, minterms) {
        if (minterms.length === 0) return [];

        const mintermSet = new Set(minterms);
        const coverage = new Map(minterms.map(mt => [mt, []]));

        // Mapeia cada mintermo aos implicantes que o cobrem.
        primeImplicants.forEach((pi, index) => {
            pi.forEach(term => {
                if (coverage.has(term)) coverage.get(term).push(index);
            });
        });

        const finalGroups = [];
        const usedMinterms = new Set();

        // Fase 1: Encontra e adiciona implicantes primos essenciais.
        const essentialPIs = new Set();
        coverage.forEach((piList) => {
            if (piList.length === 1) essentialPIs.add(piList[0]);
        });

        essentialPIs.forEach(piIndex => {
            finalGroups.push(primeImplicants[piIndex]);
            primeImplicants[piIndex].forEach(term => {
                if (mintermSet.has(term)) usedMinterms.add(term);
            });
        });

        // Fase 2: Cobre os mintermos restantes com uma abordagem "gulosa" (greedy).
        const uncoveredMinterms = new Set(minterms.filter(mt => !usedMinterms.has(mt)));
        const remainingPIs = primeImplicants.filter((_, index) => !essentialPIs.has(index));

        while (uncoveredMinterms.size > 0) {
            let bestPi = null, maxCovered = 0, bestPiIndex = -1;

            // Encontra o implicante que cobre o maior número de mintermos restantes.
            remainingPIs.forEach((pi, index) => {
                const coveredCount = pi.filter(term => uncoveredMinterms.has(term)).length;
                if (coveredCount > maxCovered) {
                    maxCovered = coveredCount;
                    bestPi = pi;
                    bestPiIndex = index;
                } else if (coveredCount > 0 && coveredCount === maxCovered) {
                    // Como critério de desempate, prefere grupos maiores (termos mais simples).
                    if (pi.length > (bestPi?.length || 0)) {
                        bestPi = pi;
                        bestPiIndex = index;
                    }
                }
            });

            if (!bestPi) break;

            finalGroups.push(bestPi);
            bestPi.forEach(term => uncoveredMinterms.delete(term));
            if (bestPiIndex > -1) remainingPIs.splice(bestPiIndex, 1);
        }
        return finalGroups;
    }

    /**
     * Converte um grupo de mintermos (ex: [0, 1, 4, 5]) para sua representação
     * em termo algébrico (ex: A'C').
     * @param {number} numVars - O número de variáveis.
     * @param {number[]} group - Um array de mintermos que formam um grupo.
     * @returns {string} O termo simplificado (ex: "A'B").
     */
    function getTermForGroup(numVars, group) {
        if (group.length === Math.pow(2, numVars)) return "1";
        
        let term = '';
        const binaries = group.map(g => g.toString(2).padStart(numVars, '0'));
        
        // Itera por cada posição de bit para encontrar as variáveis que não mudam.
        for (let i = 0; i < numVars; i++) {
            const firstBit = binaries[0][i];
            if (binaries.every(b => b[i] === firstBit)) {
                term += VAR_NAMES[i];
                if (firstBit === '0') term += "'"; // Adiciona apóstrofo para variáveis negadas.
            }
        }
        
        // Ordena as variáveis para um formato padrão (ex: A'B em vez de BA').
        const termParts = term.match(/[A-F]'?/g);
        if (!termParts) return ""; 
        
        return termParts.sort((a, b) => a.localeCompare(b)).join('');
    }

    // --- Configuração dos Eventos da Interface ---

    // Incrementa o número de variáveis e gera a nova tabela.
    btnIncrement.addEventListener('click', () => {
        let valor = parseInt(numVariaveisInput.value);
        if (valor < 6) {
            numVariaveisInput.value = valor + 1;
            gerarTabelaVerdade();
        }
    });

    // Decrementa o número de variáveis e gera a nova tabela.
    btnDecrement.addEventListener('click', () => {
        let valor = parseInt(numVariaveisInput.value);
        if (valor > 2) {
            numVariaveisInput.value = valor - 1;
            gerarTabelaVerdade();
        }
    });

    // Dispara a geração do mapa e a simplificação.
    btnGerarMapa.addEventListener('click', gerarMapaEExibir);

    // Retorna da tela do mapa para a tela da tabela.
    btnVoltar.addEventListener('click', () => {
        switchView(mainView);
    });

    /**
     * Copia a expressão simplificada para a área de transferência do usuário.
     * Fornece feedback visual no botão.
     */
    btnCopiarExpressao.addEventListener('click', () => {
        const expressaoTexto = expressionElement.textContent; // Pega o texto puro, sem HTML
        
        navigator.clipboard.writeText(expressaoTexto)
            .then(() => {
                // Sucesso! Muda o texto do botão temporariamente para dar feedback.
                const originalText = btnCopiarExpressao.textContent;
                btnCopiarExpressao.textContent = 'Copiado!';
                setTimeout(() => {
                    btnCopiarExpressao.textContent = originalText;
                }, 2000); // Volta ao normal após 2 segundos
            })
            .catch(err => {
                // Erro! Loga no console para depuração.
                console.error('Falha ao copiar a expressão: ', err);
                alert('Não foi possível copiar a expressão.');
            });
    });

    /**
     * Captura a área do mapa de Karnaugh e a expressão como uma imagem JPG
     * e inicia o download no navegador do usuário.
     */
    btnSalvarJPG.addEventListener('click', () => {
        // Seleciona o container que engloba tanto o mapa quanto a expressão
        const areaParaCapturar = document.querySelector('.kmap-and-expression');
        
        // Opções para a captura, como a cor de fundo
        const options = {
            backgroundColor: '#ffffff', // Fundo branco para a imagem
            useCORS: true, // Necessário para imagens externas, se houver
            scale: 2 // Aumenta a resolução da imagem para melhor qualidade
        };

        html2canvas(areaParaCapturar, options).then(canvas => {
            // Cria um link temporário
            const link = document.createElement('a');
            
            // Converte o canvas para uma imagem JPG e define como o href do link
            link.href = canvas.toDataURL('image/jpeg', 0.9); // 0.9 é a qualidade da imagem
            
            // Define o nome do arquivo que será baixado
            // Remove os 4 primeiros caracteres da expressão (ex: "S = ")
            let expr = document.querySelector('#simplified-expression').textContent;
            expr = expr.substring(4).trim();
            link.download = `mapa-${expr}.jpg`;
            
            // Simula um clique no link para iniciar o download
            link.click();
        }).catch(err => {
            console.error('Erro ao gerar a imagem:', err);
            alert('Ocorreu um erro ao tentar salvar a imagem.');
        });
    });

    // Dispara a geração do mapa e a simplificação.
    btnGerarMapa.addEventListener('click', gerarMapaEExibir);

    // Retorna da tela do mapa para a tela da tabela.
    btnVoltar.addEventListener('click', () => {
        switchView(mainView);
    });

    // --- Inicialização da Aplicação ---
    gerarTabelaVerdade(); // Gera a tabela inicial.
    switchView(mainView); // Exibe a tela da tabela ao carregar.
});