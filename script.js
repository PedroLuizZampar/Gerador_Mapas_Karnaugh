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
    const btnCopyMainExpression = document.getElementById('btn-copy-main-expression');
    const btnSalvarJPG = document.getElementById('btn-salvar-jpg');
    const btnMostrarPassos = document.getElementById('btn-mostrar-passos');
    const btnCopySteps = document.getElementById('btn-copy-steps');
    const stepsContainer = document.getElementById('simplification-steps-container');

    // Define constantes e variáveis globais.
    const estadosSaida = ['0', '1', 'X'];
    const VAR_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
    const GROUP_COLORS = ['#f44336', '#2196f3', '#4caf50', '#ffc107', '#9c27b0', '#e91e63', '#00bcd4', '#ff5722'];
    let simplificationStepsLog = [];

    const switchView = (viewToShow) => {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        viewToShow.classList.add('active');
    };

    const gerarMapaEExibir = () => {
        simplificationStepsLog = [];
        stepsContainer.style.display = 'none';
        btnCopySteps.style.display = 'none';
        stepsContainer.innerHTML = '';
        btnMostrarPassos.textContent = 'Mostrar Passos';

        const numVariaveis = parseInt(numVariaveisInput.value);
        const truthTableValues = lerValoresTabela();
        const { kmapMatrices, gridConfig } = gerarMatrizesKmap(numVariaveis, truthTableValues);
        
        desenharMapaK(numVariaveis, kmapMatrices, gridConfig);
        
        try {
            const { finalGroups, expression } = simplificar(numVariaveis, kmapMatrices);

            expressionElement.innerHTML = 'S = ?';
            btnCopyMainExpression.style.display = 'none';

            if (expression === "0" || expression === "1" || !finalGroups || finalGroups.length === 0) {
                expressionElement.innerHTML = 'S = ' + (expression || '0');
                btnMostrarPassos.style.display = 'none';
                desenharGrupos(finalGroups || [], gridConfig);
                switchView(mapView);
                return;
            }
            btnMostrarPassos.style.display = 'inline-block';
            
            let stepCounter = 0;
            let currentTerms = finalGroups.map((group, i) => ({
                term: getTermForGroup(numVariaveis, group),
                color: GROUP_COLORS[i % GROUP_COLORS.length]
            }));

            simplificationStepsLog.push({
                title: `Passo ${stepCounter++}: Expressão Inicial (Soma de Produtos)`,
                termsWithMeta: [...currentTerms],
                plainExpression: formatExpressionFromTerms(currentTerms),
                explanation: 'Esta é a expressão booleana simplificada, obtida diretamente dos agrupamentos no mapa (usando o método de Quine-McCluskey). As cores correspondem aos grupos. A partir daqui, aplicaremos regras algébricas para simplificar ainda mais.'
            });

            let changedInLoop = true;
            while(changedInLoop) {
                let somethingChangedThisCycle = false;

                const factorResult = processOneFactoringStep(currentTerms);
                if (factorResult.changed) {
                    simplificationStepsLog.push({
                        title: `Passo ${stepCounter++}: Fatoração (Termo em Evidência)`,
                        termsWithMeta: factorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(factorResult.newTerms),
                        explanation: factorResult.explanation
                    });
                    currentTerms = factorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue; 
                }

                const xorResult = processOneXorStep(currentTerms);
                if (xorResult.changed) {
                    simplificationStepsLog.push({
                        title: `Passo ${stepCounter++}: Simplificação (Porta XOR/XNOR)`,
                        termsWithMeta: xorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(xorResult.newTerms),
                        explanation: xorResult.explanation
                    });
                    currentTerms = xorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }
                
                const compoundResult = processOneCompoundStep(currentTerms);
                if (compoundResult.changed) {
                    simplificationStepsLog.push({
                        title: `Passo ${stepCounter++}: Simplificação (Associativa)`,
                        termsWithMeta: compoundResult.newTerms,
                        plainExpression: formatExpressionFromTerms(compoundResult.newTerms),
                        explanation: compoundResult.explanation
                    });
                    currentTerms = compoundResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                if (!somethingChangedThisCycle) {
                    changedInLoop = false;
                }
            }
            
            let finalDisplayTerms = [...currentTerms];
            const needsXnorConversion = currentTerms.some(t => t.term.includes("⊕") && t.term.endsWith(")'"));
            
            if (needsXnorConversion) {
                finalDisplayTerms = currentTerms.map(t => ({...t, term: formatWithXNOR(t.term)}));
                
                simplificationStepsLog.push({
                    title: `Passo ${stepCounter++}: Conversão para Notação XNOR (⊙)`,
                    termsWithMeta: [...finalDisplayTerms],
                    plainExpression: formatExpressionFromTerms(finalDisplayTerms),
                    explanation: "Para uma representação final mais limpa, convertemos a notação XNOR da forma (P ⊕ Q)' para a forma P ⊙ Q."
                });
            }

            expressionElement.innerHTML = 'S = ' + formatExpressionHTML(finalDisplayTerms, false);
            btnCopyMainExpression.style.display = 'inline-flex';
            desenharGrupos(finalGroups, gridConfig);

        } catch (e) {
            console.error("Erro durante a simplificação:", e);
            expressionElement.textContent = "S = Erro na simplificação";
        }
        
        switchView(mapView);
    };
    
    function formatExpressionHTML(terms, useColors = true) {
        const termStrings = terms.map(meta => {
            const termText = meta.term.replace(/'/g, '’');
            if (useColors && meta.color) {
                return `<span style="color: ${meta.color}; font-weight: 700;">${termText}</span>`;
            }
            return `<span style="font-weight: 700;">${termText}</span>`;
        });
        return termStrings.join(' + ');
    }

    function formatExpressionFromTerms(terms) {
        const termStrings = terms.map(t => t.term);
        return 'S = ' + termStrings.join(' + ');
    }
    
    function gerarTabelaVerdade(){const numVars=parseInt(numVariaveisInput.value);tabelaContainer.innerHTML="";const numLinhas=Math.pow(2,numVars);const table=document.createElement("table");table.innerHTML=`
            <thead>
                <tr>
                    ${VAR_NAMES.slice(0,numVars).map(v=>`<th>${v}</th>`).join("")}
                    <th>S</th>
                </tr>
            </thead>
            <tbody>
                ${Array.from({length:numLinhas},(_,i)=>`
                    <tr>
                        ${i.toString(2).padStart(numVars,"0").split("").map(bit=>`<td>${bit}</td>`).join("")}
                        <td class="output-cell" data-current-state="0">0</td>
                    </tr>
                `).join("")}
            </tbody>
        `;table.querySelectorAll(".output-cell").forEach(cell=>{cell.addEventListener("click",()=>{let currentStateIndex=(parseInt(cell.dataset.currentState)+1)%estadosSaida.length;cell.textContent=estadosSaida[currentStateIndex];cell.dataset.currentState=currentStateIndex;cell.classList.toggle("x-value",cell.textContent==="X");cell.classList.toggle("one-value",cell.textContent==="1")})});tabelaContainer.appendChild(table)}
    function lerValoresTabela(){return Array.from(document.querySelectorAll(".output-cell")).map(cell=>cell.textContent)}
    function getKmapGridConfig(numVars){if(numVars===2)return{rows:2,cols:2,numSubGrids:1,varsLeft:["A"],varsTop:["B"]};if(numVars===3)return{rows:2,cols:4,numSubGrids:1,varsLeft:["A"],varsTop:["B","C"]};if(numVars===4)return{rows:4,cols:4,numSubGrids:1,varsLeft:["A","B"],varsTop:["C","D"]};if(numVars===5)return{rows:4,cols:4,numSubGrids:2,varsSub:["A"],varsLeft:["B","C"],varsTop:["D","E"]};if(numVars===6)return{rows:4,cols:4,numSubGrids:4,varsSub:["A","B"],varsLeft:["C","D"],varsTop:["E","F"]};return{}}
    function ttIndexToKmapPos(index,numVars){const bin=index.toString(2).padStart(numVars,"0");const grayCode=[0,1,3,2];let row,col,grid=0;switch(numVars){case 2:row=parseInt(bin[0],2);col=parseInt(bin[1],2);break;case 3:row=parseInt(bin[0],2);col=grayCode.indexOf(parseInt(bin.substring(1,3),2));break;case 4:row=grayCode.indexOf(parseInt(bin.substring(0,2),2));col=grayCode.indexOf(parseInt(bin.substring(2,4),2));break;case 5:grid=parseInt(bin[0],2);row=grayCode.indexOf(parseInt(bin.substring(1,3),2));col=grayCode.indexOf(parseInt(bin.substring(3,5),2));break;case 6:grid=grayCode.indexOf(parseInt(bin.substring(0,2),2));row=grayCode.indexOf(parseInt(bin.substring(2,4),2));col=grayCode.indexOf(parseInt(bin.substring(4,6),2));break}return{grid,row,col}}
    function kmapPosToTTIndex(pos,numVars){let bin="";const grayCode=[0,1,3,2];switch(numVars){case 2:bin=`${pos.row.toString(2)}${pos.col.toString(2)}`;break;case 3:bin=`${pos.row.toString(2)}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break;case 4:bin=`${grayCode[pos.row].toString(2).padStart(2,"0")}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break;case 5:bin=`${pos.grid.toString(2)}${grayCode[pos.row].toString(2).padStart(2,"0")}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break;case 6:bin=`${grayCode[pos.grid].toString(2).padStart(2,"0")}${grayCode[pos.row].toString(2).padStart(2,"0")}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break}return parseInt(bin,2)}
    function gerarMatrizesKmap(numVars,values){const gridConfig=getKmapGridConfig(numVars);if(!gridConfig.rows)return{kmapMatrices:[],gridConfig:{}};const kmapMatrices=Array.from({length:gridConfig.numSubGrids},()=>Array(gridConfig.rows).fill(null).map(()=>Array(gridConfig.cols).fill(null)));values.forEach((val,index)=>{const pos=ttIndexToKmapPos(index,numVars);if(kmapMatrices[pos.grid]?.[pos.row]!==undefined){kmapMatrices[pos.grid][pos.row][pos.col]=val}});return{kmapMatrices,gridConfig}}
    function desenharMapaK(numVars,kmapMatrices,gridConfig){kmapContainer.innerHTML="";if(!gridConfig.rows)return;const mainWrapper=document.createElement("div");kmapContainer.appendChild(mainWrapper);const buildMapGrid=(matrix,gridIndex,vars)=>{const{varsLeft,varsTop}=vars;const hasSplitLeft=varsLeft.length>1;const hasSplitTop=varsTop.length>1;const leftHeaderCols=varsLeft.length>0?1:0;const headerRows=varsTop.length>0?1:0;const totalRows=headerRows+gridConfig.rows+(hasSplitTop?1:0);const totalCols=leftHeaderCols+gridConfig.cols+(hasSplitLeft?1:0);const mapContainer=document.createElement("div");mapContainer.className="kmap-sub-grid-container";const kmap=document.createElement("div");kmap.className="kmap";kmap.id=`kmap-grid-${gridIndex}`;kmap.style.display="grid";kmap.style.gridTemplateRows=`repeat(${totalRows}, auto)`;kmap.style.gridTemplateColumns=`repeat(${totalCols}, auto)`;const corner=document.createElement("div");corner.style.gridArea=`1 / 1 / ${headerRows+1} / ${leftHeaderCols+1}`;kmap.appendChild(corner);if(varsTop.length>0){const mainVar=varsTop[0];const labels=[`${mainVar}'`,mainVar];const colSpan=gridConfig.cols/labels.length;labels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`1 / ${leftHeaderCols+1+i*colSpan} / 2 / ${leftHeaderCols+1+(i*colSpan+colSpan)}`;kmap.appendChild(h)})}
    if(hasSplitTop){const subVar=varsTop[1];const subLabels=[`${subVar}'`,subVar,subVar,`${subVar}'`];const bottomRowGridStart=headerRows+gridConfig.rows+1;subLabels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`${bottomRowGridStart} / ${leftHeaderCols+1+i} / ${bottomRowGridStart+1} / ${leftHeaderCols+2+i}`;kmap.appendChild(h)})}
    if(varsLeft.length>0){const mainVar=varsLeft[0];const labels=[`${mainVar}'`,mainVar];const rowSpan=gridConfig.rows/labels.length;labels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`${headerRows+1+i*rowSpan} / 1 / ${headerRows+1+(i*rowSpan+rowSpan)} / 2`;kmap.appendChild(h)})}
    if(hasSplitLeft){const subVar=varsLeft[1];const subLabels=[`${subVar}'`,subVar,subVar,`${subVar}'`];const rightHeaderColStart=leftHeaderCols+gridConfig.cols+1;subLabels.forEach((label,r)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`${headerRows+1+r} / ${rightHeaderColStart} / ${headerRows+2+r} / ${rightHeaderColStart+1}`;kmap.appendChild(h)})}
    matrix.forEach((rowData,r)=>{rowData.forEach((cellData,c)=>{const cell=document.createElement("div");cell.className="kmap-cell";if(cellData==="X")cell.classList.add("x-value");if(cellData==="1")cell.classList.add("one-value");cell.textContent=cellData;cell.style.gridArea=`${headerRows+1+r} / ${leftHeaderCols+1+c} / ${headerRows+2+r} / ${leftHeaderCols+2+c}`;kmap.appendChild(cell)})});mapContainer.appendChild(kmap);return mapContainer};if(numVars<=4){mainWrapper.appendChild(buildMapGrid(kmapMatrices[0],0,gridConfig))}else if(numVars===5){mainWrapper.style.display="flex";mainWrapper.style.alignItems="center";mainWrapper.style.gap="20px";const divA0=document.createElement("div");const divA1=document.createElement("div");divA0.innerHTML=`<h3>${gridConfig.varsSub[0]}'</h3>`;divA1.innerHTML=`<h3>${gridConfig.varsSub[0]}</h3>`;divA0.appendChild(buildMapGrid(kmapMatrices[0],0,{varsLeft:gridConfig.varsLeft,varsTop:gridConfig.varsTop}));divA1.appendChild(buildMapGrid(kmapMatrices[1],1,{varsLeft:gridConfig.varsLeft,varsTop:gridConfig.varsTop}));mainWrapper.append(divA0,divA1)}else if(numVars===6){mainWrapper.style.display="grid";mainWrapper.style.gridTemplateColumns="auto auto auto";mainWrapper.style.gridTemplateRows="auto auto auto";mainWrapper.style.gap="5px 15px";mainWrapper.style.alignItems="center";mainWrapper.style.justifyItems="center";const mainGridVarV=gridConfig.varsSub[0];const mainGridVarH=gridConfig.varsSub[1];const corner=document.createElement("div");corner.style.gridArea="1 / 1";mainWrapper.appendChild(corner);const topLabels=[`${mainGridVarH}'`,mainGridVarH];topLabels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`1 / ${2+i}`;mainWrapper.appendChild(h)});const leftLabels=[`${mainGridVarV}'`,mainGridVarV];leftLabels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.padding="10px";h.style.gridArea=`${2+i} / 1`;mainWrapper.appendChild(h)});const subGridConfig={varsLeft:gridConfig.varsLeft,varsTop:gridConfig.varsTop};const placement={"0":"2 / 2","1":"2 / 3","3":"3 / 2","2":"3 / 3"};kmapMatrices.forEach((matrix,index)=>{const map=buildMapGrid(matrix,index,subGridConfig);map.style.gridArea=placement[index];mainWrapper.appendChild(map)})}}
    function desenharGrupos(groups,gridConfig){document.querySelectorAll(".kmap-group").forEach(el=>el.remove());const{rows,cols}=gridConfig;const BORDER_WIDTH=4;const drawRect=(rect,color,groupIndex)=>{const kmapGrid=document.getElementById(`kmap-grid-${rect.grid}`);if(!kmapGrid)return;const numVariaveis=parseInt(numVariaveisInput.value);const subGridConfig=numVariaveis<=4?gridConfig:{varsLeft:gridConfig.varsLeft,varsTop:gridConfig.varsTop};const leftHeaderCols=subGridConfig.varsLeft.length>0?1:0;const topHeaderRows=subGridConfig.varsTop.length>0?1:0;const groupDiv=document.createElement("div");groupDiv.className="kmap-group";groupDiv.style.borderColor=color;groupDiv.style.margin=`${groupIndex*BORDER_WIDTH}px`;groupDiv.style.borderWidth=`${BORDER_WIDTH}px`;groupDiv.style.gridArea=`${topHeaderRows+rect.r+1} / ${leftHeaderCols+rect.c+1} / ${topHeaderRows+rect.r+1+rect.h} / ${leftHeaderCols+rect.c+1+rect.w}`;kmapGrid.appendChild(groupDiv)};groups.forEach((group,i)=>{const color=GROUP_COLORS[i%GROUP_COLORS.length];const numVars=parseInt(numVariaveisInput.value);const groupPos=group.map(ttIndex=>ttIndexToKmapPos(ttIndex,numVars));const groupCellsByGrid={};groupPos.forEach(pos=>{if(!groupCellsByGrid[pos.grid])groupCellsByGrid[pos.grid]=[];groupCellsByGrid[pos.grid].push(pos)});for(const grid in groupCellsByGrid){const rects=findRectanglesForDrawing(groupCellsByGrid[grid],rows,cols);rects.forEach(r=>drawRect({...r,grid:parseInt(grid)},color,i))}})}
    function findRectanglesForDrawing(cells,maxRow,maxCol){if(cells.length===0)return[];const visited=new Set;const rectangles=[];const cellSet=new Set(cells.map(c=>`${c.row}-${c.col}`));cells.sort((a,b)=>a.row-b.row||a.col-b.col);cells.forEach(startCell=>{const key=`${startCell.row}-${startCell.col}`;if(visited.has(key))return;const possibleSizes=[{w:4,h:4},{w:4,h:2},{w:2,h:4},{w:4,h:1},{w:1,h:4},{w:2,h:2},{w:2,h:1},{w:1,h:2},{w:1,h:1}];for(const size of possibleSizes){if(canFormRectangle(startCell,size,cellSet,maxRow,maxCol,visited)){const rect=createRectangle(startCell,size,maxRow,maxCol,visited);rectangles.push(...rect);break}}});return rectangles}
    function canFormRectangle(startCell,size,cellSet,maxRow,maxCol,visited){for(let r=0;r<size.h;r++){for(let c=0;c<size.w;c++){const row=(startCell.row+r)%maxRow;const col=(startCell.col+c)%maxCol;if(!cellSet.has(`${row}-${col}`)||visited.has(`${row}-${col}`))return false}}return true}
    function createRectangle(startCell,size,maxRow,maxCol,visited){const rectangles=[];for(let r=0;r<size.h;r++){for(let c=0;c<size.w;c++)visited.add(`${(startCell.row+r)%maxRow}-${(startCell.col+c)%maxCol}`)}
    if(startCell.col+size.w>maxCol){const w1=maxCol-startCell.col;const w2=size.w-w1;rectangles.push({r:startCell.row,c:startCell.col,w:w1,h:size.h});rectangles.push({r:startCell.row,c:0,w:w2,h:size.h})}else if(startCell.row+size.h>maxRow){const h1=maxRow-startCell.row;const h2=size.h-h1;rectangles.push({r:startCell.row,c:startCell.col,w:size.w,h:h1});rectangles.push({r:0,c:startCell.col,w:size.w,h:h2})}else{rectangles.push({r:startCell.row,c:startCell.col,w:size.w,h:size.h})}
    return rectangles}
    function simplificar(numVars,matrices){const minterms=[],dontCares=[];matrices.forEach((matrix,grid)=>{matrix.forEach((row,r)=>{row.forEach((val,c)=>{if(val==="1"||val==="X"){const ttIndex=kmapPosToTTIndex({grid,row:r,col:c},numVars);if(val==="1")minterms.push(ttIndex);if(val==="X")dontCares.push(ttIndex)}})})});if(minterms.length===0)return{expression:"0",finalGroups:[]};const allTerms=[...minterms,...dontCares];if(allTerms.length===Math.pow(2,numVars))return{expression:"1",finalGroups:[Array.from({length:Math.pow(2,numVars)},(_,i)=>i)]};const primeImplicants=findPrimeImplicants(numVars,allTerms);const finalGroups=selectMinimalCover(primeImplicants,minterms);const expression=finalGroups.map(group=>getTermForGroup(numVars,group)).filter(Boolean).join(" + ");return{finalGroups,expression}}
    function findPrimeImplicants(numVars,terms){if(terms.length===0)return[];let currentLevel=new Map;terms.forEach(term=>{const ones=(term.toString(2).match(/1/g)||[]).length;if(!currentLevel.has(ones))currentLevel.set(ones,[]);currentLevel.get(ones).push({term,mask:0})});const primeImplicants=[];while(currentLevel.size>0){const nextLevel=new Map;const combined=new Set;for(let ones=0;ones<numVars;ones++){const group1=currentLevel.get(ones)||[];const group2=currentLevel.get(ones+1)||[];group1.forEach((item1,i1)=>{group2.forEach((item2,i2)=>{if(canCombineItems(item1,item2)){const newItem=combineItems(item1,item2);const newOnes=(newItem.term.toString(2).match(/1/g)||[]).length;if(!nextLevel.has(newOnes))nextLevel.set(newOnes,[]);if(!nextLevel.get(newOnes).some(ex=>ex.term===newItem.term&&ex.mask===newItem.mask))nextLevel.get(newOnes).push(newItem);combined.add(`${ones}-${i1}`);combined.add(`${ones+1}-${i2}`)}})})};currentLevel.forEach((group,ones)=>{group.forEach((item,index)=>{if(!combined.has(`${ones}-${index}`))primeImplicants.push(expandImplicant(item,numVars))})});currentLevel=nextLevel}
    return primeImplicants}
    function canCombineItems(item1,item2){const diff=item1.term^item2.term;return item1.mask===item2.mask&&diff>0&&(diff&(diff-1))===0}
    function combineItems(item1,item2){return{term:item1.term&item2.term,mask:item1.mask|(item1.term^item2.term)}}
    function expandImplicant(item,numVars){const terms=[];const dontCareBits=[];for(let i=0;i<numVars;i++)if(item.mask&(1<<i))dontCareBits.push(i);for(let i=0;i<(1<<dontCareBits.length);i++){let newTerm=item.term;for(let j=0;j<dontCareBits.length;j++)if(i&(1<<j))newTerm|=1<<dontCareBits[j];terms.push(newTerm)}
    return terms.sort((a,b)=>a-b)}
    function selectMinimalCover(primeImplicants,minterms){if(minterms.length===0)return[];const mintermSet=new Set(minterms);const coverage=new Map(minterms.map(mt=>[mt,[]]));primeImplicants.forEach((pi,index)=>pi.forEach(term=>{if(coverage.has(term))coverage.get(term).push(index)}));const finalGroups=[];const usedMinterms=new Set;const essentialPIs=new Set;coverage.forEach(piList=>{if(piList.length===1)essentialPIs.add(piList[0])});essentialPIs.forEach(piIndex=>{finalGroups.push(primeImplicants[piIndex]);primeImplicants[piIndex].forEach(term=>{if(mintermSet.has(term))usedMinterms.add(term)})});const uncoveredMinterms=new Set(minterms.filter(mt=>!usedMinterms.has(mt)));const remainingPIs=primeImplicants.filter((_,index)=>!essentialPIs.has(index));while(uncoveredMinterms.size>0){let bestPi=null,maxCovered=0,bestPiIndex=-1;remainingPIs.forEach((pi,index)=>{const coveredCount=pi.filter(term=>uncoveredMinterms.has(term)).length;if(coveredCount>maxCovered){maxCovered=coveredCount;bestPi=pi;bestPiIndex=index}
    else if(coveredCount>0&&coveredCount===maxCovered&&pi.length>(bestPi?.length||0)){bestPi=pi;bestPiIndex=index}});if(!bestPi)break;finalGroups.push(bestPi);bestPi.forEach(term=>uncoveredMinterms.delete(term));if(bestPiIndex>-1)remainingPIs.splice(bestPiIndex,1)}
    return finalGroups}
    function getTermForGroup(numVars,group){if(group.length===Math.pow(2,numVars))return"1";let term="";const binaries=group.map(g=>g.toString(2).padStart(numVars,"0"));for(let i=0;i<numVars;i++){const firstBit=binaries[0][i];if(binaries.every(b=>b[i]===firstBit)){term+=VAR_NAMES[i];if(firstBit==="0")term+="'"}}
    const termParts=term.match(/[A-F]'?/g);if(!termParts)return"";return termParts.sort((a,b)=>a.localeCompare(b)).join("")}

    function processOneXorStep(termsWithMeta) {
        const parseTerm = (termStr) => {
            const vars = {};
            if (termStr === '1') return vars;
            const parts = termStr.match(/[A-F]'?/g) || [];
            parts.forEach(part => {
                vars[part.charAt(0)] = !part.includes("'");
            });
            return vars;
        };

        const formatPrefix = (prefixVars) => {
            let term = '';
            Object.keys(prefixVars).sort().forEach(v => {
                term += v;
                if (!prefixVars[v]) term += "'";
            });
            return term;
        };

        const originalTerms = [...termsWithMeta];
        
        for (let i = 0; i < originalTerms.length; i++) {
            for (let j = i + 1; j < originalTerms.length; j++) {
                const term1 = originalTerms[i];
                const term2 = originalTerms[j];

                if (term1.term.includes('(') || term2.term.includes(')')) continue;

                const parsed1 = parseTerm(term1.term);
                const parsed2 = parseTerm(term2.term);
                const allVars = new Set([...Object.keys(parsed1), ...Object.keys(parsed2)]);
                
                if (Object.keys(parsed1).length !== allVars.size || Object.keys(parsed2).length !== allVars.size) {
                    continue;
                }

                const prefixVars = {};
                const diffVars = [];

                allVars.forEach(v => {
                    if (parsed1[v] === parsed2[v]) {
                        prefixVars[v] = parsed1[v];
                    } else {
                        diffVars.push(v);
                    }
                });

                if (diffVars.length !== 2) continue;
                
                const [v1, v2] = diffVars.sort();

                if (parsed1[v1] === parsed2[v1] || parsed1[v2] === parsed2[v2]) continue;
                
                const isXnor = (parsed1[v1] === parsed1[v2]);
                const prefixStr = formatPrefix(prefixVars);
                let newTermStr = isXnor ? `(${v1} ⊕ ${v2})'` : `(${v1} ⊕ ${v2})`;
                if (prefixStr) newTermStr = `${prefixStr}${newTermStr}`;

                const newTerms = [...originalTerms];
                newTerms.splice(j, 1);
                newTerms.splice(i, 1, { term: newTermStr, color: term1.color });

                const explanation = `Os termos <strong>${term1.term}</strong> e <strong>${term2.term}</strong> foram combinados para formar o termo ${isXnor ? "XNOR" : "XOR"} <strong>${newTermStr}</strong>.`;
                
                return { newTerms, changed: true, explanation };
            }
        }

        return { changed: false };
    }
    
    function processOneCompoundStep(termsWithMeta) {
        const parseCompoundTerm = (termStr) => {
            const match = termStr.match(/^(.*?)\((.*)\)('?)$/);
            if (match) {
                const innerPart = match[2];
                if (!innerPart.includes('⊕')) return { prefixStr: termStr, xorPart: null, isXnor: false };
                return {
                    prefixStr: match[1] || '',
                    xorPart: innerPart,
                    isXnor: match[3] === "'"
                };
            }
            return { prefixStr: termStr, xorPart: null, isXnor: false };
        };
        const parseTerm = (termStr) => {
            const vars = {};
            if (termStr === '1' || termStr === '') return vars;
            const parts = termStr.match(/[A-F]'?/g) || [];
            parts.forEach(part => {
                vars[part.charAt(0)] = !part.includes("'");
            });
            return vars;
        };
        const formatPrefix = (prefixVars) => {
            let term = '';
            Object.keys(prefixVars).sort().forEach(v => {
                term += v;
                if (!prefixVars[v]) term += "'";
            });
            return term;
        };
        const checkPrefixInverse = (p1_vars, p2_vars) => {
            const p1_keys = Object.keys(p1_vars);
            const p2_keys = Object.keys(p2_vars);
    
            // Os prefixos devem ter o mesmo conjunto de variáveis para serem considerados inversos simples.
            if (p1_keys.length !== p2_keys.length) return { isInverse: false };
            const allVars = new Set([...p1_keys, ...p2_keys]);
            if (allVars.size !== p1_keys.length) return { isInverse: false };
    
            const commonPrefix = {};
            const diffVars = [];
    
            for (const v of allVars) {
                if (p1_vars[v] === p2_vars[v]) {
                    commonPrefix[v] = p1_vars[v];
                } else {
                    diffVars.push(v);
                }
            }
    
            // Exatamente uma variável deve ser diferente.
            if (diffVars.length === 1) {
                return { isInverse: true, diffVar: diffVars[0], commonPrefix };
            }
    
            return { isInverse: false };
        };

        const currentTerms = [...termsWithMeta];
        for (let i = 0; i < currentTerms.length; i++) {
            for (let j = i + 1; j < currentTerms.length; j++) {
                const term1 = currentTerms[i];
                const term2 = currentTerms[j];
                const parsed1 = parseCompoundTerm(term1.term);
                const parsed2 = parseCompoundTerm(term2.term);

                if (parsed1.xorPart && parsed2.xorPart && parsed1.xorPart === parsed2.xorPart && parsed1.isXnor !== parsed2.isXnor) {
                    const prefix1 = parseTerm(parsed1.prefixStr);
                    const prefix2 = parseTerm(parsed2.prefixStr);
                    const { isInverse, diffVar, commonPrefix } = checkPrefixInverse(prefix1, prefix2);

                    if (isInverse) {
                        const commonPrefixStr = formatPrefix(commonPrefix);
                        const pIsNegatedInTerm1 = !prefix1[diffVar];
                        const qIsXnorInTerm1 = parsed1.isXnor;
                        const finalIsXnor = (pIsNegatedInTerm1 === qIsXnorInTerm1);
                        
                        const pTerm = diffVar;
                        const qVars = parsed1.xorPart.match(/[\w']+/g) || [];
                        const allXorVars = [pTerm, ...qVars].sort((a,b) => a.localeCompare(b));

                        let newTermStr = `(${allXorVars.join(' ⊕ ')})`;

                        if (finalIsXnor) {
                           newTermStr += "'";
                        }

                        if (commonPrefixStr) newTermStr = `${commonPrefixStr}${newTermStr}`;

                        const newTermsList = [...currentTerms];
                        newTermsList.splice(j, 1);
                        newTermsList.splice(i, 1, { term: newTermStr, color: term1.color });

                        const explanation = `Analisando os termos <strong>${term1.term}</strong> e <strong>${term2.term}</strong>, reconhecemos o padrão <code>${finalIsXnor ? "P'Q' + PQ" : "P'Q + PQ'"}</code>. Isso simplifica para uma única porta ${finalIsXnor ? "XNOR" : "XOR"}, resultando em <strong>${newTermStr}</strong>.`;
                        return { newTerms: newTermsList, changed: true, explanation };
                    }
                }
            }
        }
        return { changed: false };
    }
    
    function processOneFactoringStep(termsWithMeta) {
        const simpleTerms = termsWithMeta.filter(t => !t.term.includes('⊕') && !t.term.includes('('));
        const complexTerms = termsWithMeta.filter(t => t.term.includes('⊕') || t.term.includes('('));

        if (simpleTerms.length < 2) return { changed: false };
        
        const potentialFactors = generatePotentialFactors(simpleTerms);
        if (potentialFactors.length === 0) return { changed: false };

        const bestFactor = potentialFactors[0];
        if (bestFactor.score <= 0) return { changed: false };
        
        const groupTermObjs = bestFactor.group;
        const groupTermStrs = groupTermObjs.map(t => t.term);
        const groupTermSet = new Set(groupTermStrs);
        const leftoverTerms = simpleTerms.filter(t => !groupTermSet.has(t.term));
        
        const remainders = groupTermObjs.map(termObj => {
            const termLiterals = new Set(termObj.term.match(/[A-F]'?/g) || []);
            const prefixLiterals = new Set(bestFactor.prefix.match(/[A-F]'?/g) || []);
            const remainderLiterals = [...termLiterals].filter(lit => !prefixLiterals.has(lit));
            return {
                term: remainderLiterals.length > 0 ? remainderLiterals.sort().join('') : '1',
                color: termObj.color
            };
        });

        const initialRemaindersStr = remainders.map(r => r.term).join(' + ');
        const simplifiedRemainders = runInnerSimplification(remainders);
        const simplifiedRemaindersStr = simplifiedRemainders.map(t => t.term).join(' + ');
        
        let newFactoredTermStr;
        const isSingleComplexTerm = simplifiedRemainders.length === 1 && simplifiedRemaindersStr.startsWith('(') && (simplifiedRemaindersStr.endsWith(')') || simplifiedRemaindersStr.endsWith(")'"));

        if (isSingleComplexTerm) {
            newFactoredTermStr = `${bestFactor.prefix}${simplifiedRemaindersStr}`;
        } else {
            newFactoredTermStr = `${bestFactor.prefix}(${simplifiedRemaindersStr})`;
        }
        
        const newFactoredTerm = { term: newFactoredTermStr, color: groupTermObjs[0].color };
        const finalTerms = [newFactoredTerm, ...leftoverTerms, ...complexTerms];

        let explanation = `O fator comum <strong>${bestFactor.prefix}</strong> foi colocado em evidência nos termos <strong>${groupTermStrs.join(', ')}</strong>.`;
        if (initialRemaindersStr !== simplifiedRemaindersStr) {
            explanation += ` A expressão interna resultante <code>${initialRemaindersStr}</code> foi subsequentemente simplificada para <code>${simplifiedRemaindersStr}</code>.`;
        }

        return { newTerms: finalTerms, changed: true, explanation };
    }

    // --- INÍCIO DA CORREÇÃO ---
    function runInnerSimplification(terms) {
        let currentTerms = [...terms];
        let changed = true;
        while(changed) {
            let changedThisCycle = false;
            
            // Adiciona a tentativa de fatoração dentro do loop de simplificação interna
            const factorResult = processOneFactoringStep(currentTerms);
            if (factorResult.changed) {
                currentTerms = factorResult.newTerms;
                changedThisCycle = true;
                continue;
            }

            const xorResult = processOneXorStep(currentTerms);
            if (xorResult.changed) {
                currentTerms = xorResult.newTerms;
                changedThisCycle = true;
                continue;
            }

            const compoundResult = processOneCompoundStep(currentTerms);
            if (compoundResult.changed) {
                currentTerms = compoundResult.newTerms;
                changedThisCycle = true;
                continue;
            }

            if(!changedThisCycle) {
                changed = false;
            }
        }
        return currentTerms;
    }
    // --- FIM DA CORREÇÃO ---

    function generatePotentialFactors(terms) {
        const countLiterals = (str) => (str.match(/[A-F]/g) || []).length;

        const prefixMap = new Map();
        terms.forEach(termObj => {
            const prefixes = getPrefixes(termObj.term);
            prefixes.forEach(p => {
                if (!prefixMap.has(p)) prefixMap.set(p, []);
                prefixMap.get(p).push(termObj);
            });
        });
        
        const potentialFactors = [];
        prefixMap.forEach((group, prefix) => {
            if (group.length > 1) {
                const score = (group.length - 1) * countLiterals(prefix);
                potentialFactors.push({ prefix, group, score });
            }
        });

        return potentialFactors.sort((a, b) => b.score - a.score);
    }

    function getPrefixes(term) {
        const literals = term.match(/[A-F]'?/g) || [];
        if (literals.length === 0) return [];
        const prefixes = new Set();
        const n = literals.length;
        for (let i = 1; i < (1 << n); i++) {
            const subset = [];
            for (let j = 0; j < n; j++) {
                if ((i >> j) & 1) subset.push(literals[j]);
            }
            prefixes.add(subset.sort().join(''));
        }
        return Array.from(prefixes);
    }

    function countLiteralsInExpression(termStrings) {
        let count = 0;
        termStrings.forEach(str => {
            const literals = str.match(/[A-F]/g);
            if (literals) count += literals.length;
        });
        return count;
    }
    
    function formatWithXNOR(termStr) {
        // Esta expressão regular identifica um prefixo (que pode ser vazio)
        // seguido por uma expressão XNOR simples (ex: C ⊕ D) que precisa ser convertida.
        const match = termStr.match(/^(.*)\(([^()]+⊕[^()]+)\)'$/);

        if (match) {
            const prefix = match[1]; // Captura o prefixo, ex: "A'B'"
            const xorPart = match[2];  // Captura a parte interna, ex: "C ⊕ D"
            
            // Substitui apenas na parte interna e reconstrói a string
            const xnorPart = xorPart.replace('⊕', '⊙');
            return `${prefix}(${xnorPart})`;
        }
    
        // Se não corresponder ao padrão esperado, retorna a string original para evitar corrompê-la.
        return termStr;
    }


    function showCopyFeedback(button, iconClass) {
        const icon = button.querySelector('i');
        icon.classList.remove(iconClass);
        icon.classList.add('bi-clipboard-check');
        button.style.color = 'green';
        setTimeout(() => {
            icon.classList.remove('bi-clipboard-check');
            icon.classList.add(iconClass);
            button.style.color = '';
        }, 2000);
    }

    // --- Configuração dos Eventos da Interface ---

    btnIncrement.addEventListener('click', () => { let v = parseInt(numVariaveisInput.value); if (v < 6) { numVariaveisInput.value = v + 1; gerarTabelaVerdade(); } });
    btnDecrement.addEventListener('click', () => { let v = parseInt(numVariaveisInput.value); if (v > 2) { numVariaveisInput.value = v - 1; gerarTabelaVerdade(); } });
    btnGerarMapa.addEventListener('click', gerarMapaEExibir);
    btnVoltar.addEventListener('click', () => switchView(mainView));
    
    btnCopyMainExpression.addEventListener('click', () => {
        const textToCopy = expressionElement.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCopyFeedback(btnCopyMainExpression, 'bi-clipboard');
        }).catch(err => console.error('Falha ao copiar expressão:', err));
    });

    btnSalvarJPG.addEventListener('click', () => {
        const areaParaCapturar = document.querySelector('.kmap-and-expression');
        html2canvas(areaParaCapturar, { backgroundColor: '#ffffff', useCORS: true, scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            let expr = expressionElement.textContent.substring(4).trim().replace(/[^a-zA-Z0-9-]/g, '');
            link.download = `mapa-${expr || 'simplificado'}.jpg`;
            link.click();
        }).catch(err => console.error('Erro ao salvar imagem:', err));
    });

    btnMostrarPassos.addEventListener('click', () => {
        const isHidden = stepsContainer.style.display === 'none';
        if (isHidden) {
            stepsContainer.innerHTML = '';
            simplificationStepsLog.forEach((step, index) => {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'step';
                
                const useColors = (index === 0);
                const expressionHTML = formatExpressionHTML(step.termsWithMeta, useColors);
                const plainExpression = formatExpressionFromTerms(step.termsWithMeta);
                
                stepDiv.innerHTML = `
                    <div class="step-title">${step.title}</div>
                    <div class="step-explanation">${step.explanation}</div>
                    <div class="step-expression-container">
                        <div class="step-expression">${expressionHTML}</div>
                        <button class="copy-icon-button copy-step-btn" data-expression="${plainExpression}" title="Copiar Expressão do Passo">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                `;
                stepsContainer.appendChild(stepDiv);
            });
            stepsContainer.style.display = 'block';
            btnMostrarPassos.textContent = 'Ocultar Passos';
            btnCopySteps.style.display = 'inline-block';
        } else {
            stepsContainer.style.display = 'none';
            btnMostrarPassos.textContent = 'Mostrar Passos';
            btnCopySteps.style.display = 'none';
        }
    });

    stepsContainer.addEventListener('click', (event) => {
        const copyBtn = event.target.closest('.copy-step-btn');
        if (copyBtn) {
            const textToCopy = copyBtn.dataset.expression;
            navigator.clipboard.writeText(textToCopy).then(() => {
                showCopyFeedback(copyBtn, 'bi-clipboard');
            }).catch(err => console.error('Falha ao copiar: ', err));
        }
    });

    btnCopySteps.addEventListener('click', () => {
        const stepsContent = document.getElementById('simplification-steps-container');
        const styles = `
            <style>
                body { font-family: sans-serif; color: #1e293b; }
                .step { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; }
                .step:last-child { border-bottom: none; }
                .step-title { font-weight: 700; font-size: 1.2rem; color: #1e293b; margin-bottom: 0.5rem; }
                .step-explanation { font-size: 1rem; color: #475569; margin-bottom: 1rem; line-height: 1.6; }
                .step-expression-container { display: flex; align-items: center; background-color: #f1f5f9; padding: 0.75rem 1rem; border-radius: 0.5rem; }
                .step-expression { font-family: monospace; font-size: 1.1rem; color: rgb(0, 60, 189); flex-grow: 1; }
                .copy-icon-button { display: none; }
                h2, p { margin: 0; }
            </style>
        `;
        const htmlToCopy = `<!DOCTYPE html><html><head>${styles}</head><body><h2>Passos da Simplificação</h2>${stepsContent.innerHTML}</body></html>`;

        try {
            const blob = new Blob([htmlToCopy], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            navigator.clipboard.write([clipboardItem]).then(() => {
                const originalText = btnCopySteps.textContent;
                btnCopySteps.textContent = 'Copiado!';
                setTimeout(() => { btnCopySteps.textContent = originalText; }, 2000);
            });
        } catch (e) {
            console.error('Falha ao copiar conteúdo formatado:', e);
            alert('Seu navegador não suporta a cópia de conteúdo formatado.');
        }
    });

    // --- Inicialização da Aplicação ---
    gerarTabelaVerdade();
    switchView(mainView);
});