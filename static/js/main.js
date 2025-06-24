// Document ready
document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const columnSelect = document.getElementById('column-select');
    const chartCanvas = document.getElementById('chart-canvas');
    const chartContainer = document.getElementById('chart-container');
    const tableContainer = document.getElementById('table-container');
    const dataTable = document.getElementById('data-table');
    const exportPdfBtn = document.getElementById('export-pdf');
    const errorMessage = document.getElementById('error-message');
    const labelsContainer = document.getElementById('labels-container');
    const sortableLabelsContainer = document.getElementById('sortable-labels');
    const chartTypeOptions = document.querySelectorAll('.chart-type-option');
    const chartLoader = document.getElementById('chart-loader');
    
    // Variabile per tenere traccia del tipo di grafico selezionato
    let currentChartType = 'bar'; // Default: istogramma
    
    // Variabili globali
    let chartInstance = null;
    let chartData = null;
    let sortableInstance = null;
    
    // Inizialmente nascondi il contenitore delle etichette
    labelsContainer.classList.add('hidden');
    
    // Carica le colonne disponibili dal file Excel
    loadColumns();
    
    // Event listeners
    columnSelect.addEventListener('change', handleSelectionChange);
    exportPdfBtn.addEventListener('click', exportChartAsPdf);
    
    // Gestione click sulle opzioni del tipo di grafico
    chartTypeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Rimuovi la classe active da tutte le opzioni
            chartTypeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Aggiungi la classe active all'opzione selezionata
            this.classList.add('active');
            
            // Aggiorna il tipo di grafico corrente
            currentChartType = this.getAttribute('data-type');
            
            // Aggiorna la visualizzazione
            handleSelectionChange();
        });
    });
    
    /**
     * Carica le colonne disponibili dal file Excel
     */
    function loadColumns() {
        fetch('/api/columns')
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(`Errore ${response.status}: ${errData.error || 'Errore server'}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                columnSelect.innerHTML = '<option value="" selected disabled>Scegli una domanda...</option>';
                
                data.columns.forEach(column => {
                    const option = document.createElement('option');
                    option.value = column;
                    option.textContent = column;
                    columnSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Errore nel caricamento delle domande:', error);
                showError(`Si è verificato un errore durante il caricamento delle domande: ${error.message}`);
            });
    }
    
    /**
     * Gestisce il cambio di selezione della colonna o del tipo di grafico
     */
    function handleSelectionChange() {
        const column = columnSelect.value;
        
        if (!column) return;
        
        // Nascondi eventuali messaggi di errore
        errorMessage.classList.add('hidden');
        
        if (currentChartType === 'table') {
            // Mostra la tabella e nascondi il grafico
            chartContainer.classList.add('hidden');
            tableContainer.classList.remove('hidden');
            labelsContainer.classList.add('hidden');
            
            // Gestione del pulsante di esportazione
            exportPdfBtn.disabled = false;
            
            // Genera la tabella
            generateTable(column);
        } else {
            // Mostra il grafico e nascondi la tabella
            chartContainer.classList.remove('hidden');
            tableContainer.classList.add('hidden');
            
            // Mostra il loader
            chartLoader.classList.remove('hidden');
            
            // Gestione del pulsante di esportazione
            exportPdfBtn.disabled = true;
            
            // Genera il grafico
            generateChart(column, currentChartType);
        }
    }
    
    /**
     * Genera un grafico in base alla colonna e tipo selezionati
     */
    function generateChart(column, chartType) {
        fetch(`/api/data?column=${encodeURIComponent(column)}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(`Errore ${response.status}: ${errData.error || 'Errore server'}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Nascondi il loader
                chartLoader.classList.add('hidden');
                
                // Memorizza i dati per uso futuro
                chartData = data;
                
                // Prepara i dati per Chart.js
                const labels = Object.keys(data.data);
                const values = Object.values(data.data);
                
                if (labels.length === 0) {
                    showError(`La colonna "${column}" non contiene valori validi.`);
                    chartContainer.classList.add('hidden');
                    labelsContainer.classList.add('hidden');
                    exportPdfBtn.disabled = true;
                    return;
                }
                
                // Nascondi messaggi di errore e mostra il grafico
                errorMessage.classList.add('hidden');
                chartContainer.classList.remove('hidden');
                exportPdfBtn.disabled = false;
                
                // Verifica se si tratta di una colonna con risposte multiple (checkbox)
                const isCheckbox = data.is_checkbox === true;
                
                // Titolo sempre uguale al nome della colonna, senza aggiunte
                const displayColumn = column;
                
                // Genera colori distribuiti uniformemente nell'arco HSL
                const colors = generateColors(labels.length);
                
                // Distruggi il grafico esistente se presente
                if (chartInstance) {
                    chartInstance.destroy();
                }
                
                // Determina il tipo di grafico
                const isBarChart = chartType === 'bar';
                
                // Crea un elemento DOM personalizzato per la legenda
                const customLegendContainer = document.createElement('div');
                customLegendContainer.id = 'custom-legend';
                customLegendContainer.style.position = 'absolute';
                customLegendContainer.style.right = '0px';
                customLegendContainer.style.top = '40px';
                customLegendContainer.style.maxWidth = '180px';
                customLegendContainer.style.overflow = 'auto';
                customLegendContainer.style.maxHeight = '90%';
                customLegendContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                customLegendContainer.style.borderRadius = '5px';
                customLegendContainer.style.padding = '10px';
                customLegendContainer.style.boxSizing = 'border-box';
                customLegendContainer.style.fontSize = '12px';
                
                // Svuota e prepara il contenitore per la legenda personalizzata
                const existingLegend = document.getElementById('custom-legend');
                if (existingLegend) {
                    existingLegend.remove();
                }
                
                // Crea la legenda personalizzata per gli istogrammi
                if (isBarChart) {
                    // Non aggiungiamo più l'informazione che si tratta di risposte multiple
                    
                    labels.forEach((label, index) => {
                        const item = document.createElement('div');
                        item.style.display = 'flex';
                        item.style.alignItems = 'flex-start';
                        item.style.marginBottom = '8px';
                        
                        // Indicatore di colore
                        const colorBox = document.createElement('span');
                        colorBox.style.display = 'inline-block';
                        colorBox.style.width = '12px';
                        colorBox.style.height = '12px';
                        colorBox.style.backgroundColor = colors[index];
                        colorBox.style.marginRight = '8px';
                        colorBox.style.marginTop = '2px';
                        colorBox.style.flexShrink = '0';
                        
                        // Testo dell'etichetta
                        const labelText = document.createElement('span');
                        labelText.style.wordBreak = 'break-all';
                        labelText.style.lineHeight = '1.2';
                        labelText.textContent = label;
                        
                        item.appendChild(colorBox);
                        item.appendChild(labelText);
                        
                        customLegendContainer.appendChild(item);
                    });
                    
                    chartContainer.appendChild(customLegendContainer);
                }
                
                // Imposta le opzioni comuni per tutti i tipi di grafici
                const commonOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: chartType === 'pie' || chartType === 'doughnut', // Mostra la legenda solo per grafici a torta/ciambella
                            position: 'right',
                            align: 'start',
                            labels: {
                                boxWidth: 15,
                                padding: 10,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: displayColumn, // Usa il titolo aggiornato
                            font: {
                                size: 16
                            },
                            padding: {
                                bottom: 30
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = '';
                                    if (isBarChart) {
                                        // Per istogrammi, usa l'etichetta originale
                                        const index = context.dataIndex;
                                        label = labels[index] || '';
                                    } else {
                                        label = context.label || '';
                                    }
                                    
                                    const value = context.raw || 0;
                                    
                                    if (isCheckbox) {
                                        // Per le domande con risposte multiple, non mostrare la percentuale sul totale 
                                        // (non ha molto senso poiché una persona può selezionare più opzioni)
                                        return `${label}: ${value}`;
                                    } else {
                                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    },
                    layout: {
                        padding: {
                            top: 10,
                            right: isBarChart ? 200 : 10, // Spazio per la legenda personalizzata
                            bottom: 10,
                            left: 10
                        }
                    }
                };
                
                // Aggiungi opzioni specifiche per i grafici a barre e linee
                if (chartType === 'bar' || chartType === 'line') {
                    commonOptions.scales = {
                        x: {
                            ticks: {
                                display: !isBarChart, // Nascondi le etichette per tutti gli istogrammi
                                autoSkip: true,
                                maxRotation: 45,
                                minRotation: 45
                            },
                            grid: {
                                display: !isBarChart // Nascondi anche la griglia per tutti gli istogrammi
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    };
                }
                
                // Crea il nuovo grafico
                const ctx = chartCanvas.getContext('2d');
                chartInstance = new Chart(ctx, {
                    type: chartType,
                    data: {
                        labels: isBarChart ? labels.map(() => '') : labels, // Usa etichette vuote per istogrammi
                        datasets: [{
                            label: displayColumn, // Usa il titolo aggiornato anche qui
                            data: values,
                            backgroundColor: colors,
                            borderColor: 'white',
                            borderWidth: 1
                        }]
                    },
                    options: commonOptions
                });
                
                // Popola e mostra la lista ordinabile
                populateSortableLabels(labels, values, colors, isCheckbox);
            })
            .catch(error => {
                // Nascondi il loader in caso di errore
                chartLoader.classList.add('hidden');
                console.error('Errore nella generazione del grafico:', error);
                showError(`Si è verificato un errore durante la generazione del grafico: ${error.message}`);
                exportPdfBtn.disabled = true;
                labelsContainer.classList.add('hidden');
            });
    }
    
    /**
     * Popola la lista ordinabile con le etichette del grafico
     */
    function populateSortableLabels(labels, values, colors, isCheckbox = false) {
        // Pulisci la lista esistente
        sortableLabelsContainer.innerHTML = '';
        
        // Crea gli elementi della lista
        labels.forEach((label, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'sortable-item';
            listItem.dataset.index = index;
            listItem.dataset.label = label; // Memorizza l'etichetta direttamente nell'elemento
            
            // Aggiungi l'indicatore di colore
            const colorIndicator = document.createElement('span');
            colorIndicator.className = 'color-box';
            colorIndicator.style.backgroundColor = colors[index];
            
            // Aggiungi il testo dell'etichetta
            const labelText = document.createElement('span');
            labelText.className = 'label-text';
            labelText.textContent = label;
            
            // Aggiungi il badge con il valore
            const valueBadge = document.createElement('span');
            valueBadge.className = 'label-value';
            valueBadge.textContent = values[index];
            
            // Aggiungi gli elementi al list item
            listItem.appendChild(colorIndicator);
            listItem.appendChild(labelText);
            listItem.appendChild(valueBadge);
            
            // Aggiungi l'item alla lista
            sortableLabelsContainer.appendChild(listItem);
        });
        
        // Mostra il contenitore delle etichette
        labelsContainer.classList.remove('hidden');
        
        // Inizializza Sortable.js sulla lista
        initSortable();
    }
    
    /**
     * Inizializza Sortable.js sulla lista delle etichette
     */
    function initSortable() {
        // Distruggi il sortable esistente se presente
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        
        // Inizializza Sortable.js
        sortableInstance = new Sortable(sortableLabelsContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.sortable-item',
            onEnd: function(evt) {
                // Riordina il grafico in base al nuovo ordine
                reorderChart();
            }
        });
    }
    
    /**
     * Riordina il grafico in base all'ordine corrente delle etichette nella lista ordinabile
     */
    function reorderChart() {
        if (!chartInstance || !chartData) return;
        
        // Raccogli tutte le etichette nell'ordine attuale dalla lista ordinabile
        const items = Array.from(sortableLabelsContainer.querySelectorAll('.sortable-item'));
        
        // Estrai le etichette direttamente dagli elementi
        const newLabels = items.map(item => item.dataset.label);
        
        // Ottieni i valori corrispondenti alle etichette nel nuovo ordine
        const newValues = [];
        const originalLabels = Object.keys(chartData.data);
        const originalValues = Object.values(chartData.data);
        
        // Costruisci i valori in base al nuovo ordine delle etichette
        newLabels.forEach(label => {
            const originalIndex = originalLabels.indexOf(label);
            if (originalIndex !== -1) {
                newValues.push(originalValues[originalIndex]);
            }
        });
        
        // Genera nuovi colori in ordine arcobaleno
        const newColors = generateColors(newLabels.length);
        
        // Aggiorna i dati del grafico
        const isCheckbox = chartData.is_checkbox === true;
        
        // Per gli istogrammi, manteniamo le etichette vuote nella visualizzazione ma conserviamo quelle reali per le tooltip
        if (currentChartType === 'bar') {
            // Per istogrammi, visualizza etichette vuote ma memorizza quelle reali per tooltip
            chartInstance.data.labels = newLabels.map(() => '');
            
            // Aggiorna anche le tooltip per usare le etichette corrette
            chartInstance.options.plugins.tooltip.callbacks.label = function(context) {
                // Ottieni l'etichetta dal nuovo ordine
                const index = context.dataIndex;
                const label = newLabels[index] || '';
                const value = context.raw || 0;
                
                if (isCheckbox) {
                    // Per le domande con risposte multiple, non mostrare la percentuale
                    return `${label}: ${value}`;
                } else {
                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} (${percentage}%)`;
                }
            };
        } else {
            // Per altri tipi di grafici, mostra le etichette normalmente
            chartInstance.data.labels = newLabels;
        }
        
        // Aggiorna i dati nel grafico
        chartInstance.data.datasets[0].data = newValues;
        chartInstance.data.datasets[0].backgroundColor = newColors;
        
        // Titolo semplice, uguale al nome della colonna
        const displayColumn = chartData.column;
        chartInstance.options.plugins.title.text = displayColumn;
        
        // Aggiorna il grafico
        chartInstance.update();
        
        // Aggiorna la legenda personalizzata
        updateLegend(newLabels, newColors, isCheckbox);
        
        // Aggiorna i dati memorizzati
        const newData = {};
        newLabels.forEach((label, index) => {
            newData[label] = newValues[index];
        });
        chartData.data = newData;
        
        // Aggiorna anche i colori degli elementi nella lista ordinabile
        updateSortableColors(newColors);
    }
    
    /**
     * Aggiorna i colori degli elementi nella lista ordinabile
     */
    function updateSortableColors(colors) {
        const items = sortableLabelsContainer.querySelectorAll('.sortable-item');
        
        // Aggiorna i colori degli indicatori
        items.forEach((item, index) => {
            if (index < colors.length) {
                const colorIndicator = item.querySelector('.color-box');
                if (colorIndicator) {
                    colorIndicator.style.backgroundColor = colors[index];
                }
            }
        });
    }
    
    /**
     * Aggiorna la legenda con le nuove etichette e colori
     */
    function updateLegend(labels, colors, isCheckbox) {
        const customLegend = document.getElementById('custom-legend');
        if (!customLegend) return;
        
        customLegend.innerHTML = '';
        
        // Crea le etichette nell'ordine aggiornato
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'flex-start';
            item.style.marginBottom = '8px';
            
            // Indicatore di colore
            const colorBox = document.createElement('span');
            colorBox.style.display = 'inline-block';
            colorBox.style.width = '12px';
            colorBox.style.height = '12px';
            colorBox.style.backgroundColor = colors[index];
            colorBox.style.marginRight = '8px';
            colorBox.style.marginTop = '2px';
            colorBox.style.flexShrink = '0';
            
            // Testo dell'etichetta
            const labelText = document.createElement('span');
            labelText.style.wordBreak = 'break-all';
            labelText.style.lineHeight = '1.2';
            labelText.textContent = label;
            
            item.appendChild(colorBox);
            item.appendChild(labelText);
            
            customLegend.appendChild(item);
        });
    }
    
    /**
     * Esporta il grafico corrente o la tabella come PDF
     */
    function exportChartAsPdf() {
        // Se non c'è un grafico o una tabella da esportare
        if (!chartData) {
            showError('Nessun grafico o tabella da esportare');
            return;
        }
        
        // Mostra un indicatore di caricamento
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'export-loading';
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.padding = '20px';
        loadingIndicator.style.borderRadius = '10px';
        loadingIndicator.style.zIndex = '1000';
        loadingIndicator.textContent = 'Esportazione in corso...';
        document.body.appendChild(loadingIndicator);
        
        // Controlla se si sta esportando una tabella o un grafico
        const chartType = currentChartType;
        
        if (chartType === 'table') {
            exportTableAsPdf();
        } else {
            exportGraphAsPdf();
        }
        
        function exportTableAsPdf() {
            // Ottieni il titolo
            const displayTitle = chartData.column;
            
            // Crea un nuovo documento PDF
            const pdf = new jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Aggiungi metadati al PDF
            pdf.setProperties({
                title: `Tabella ${displayTitle}`,
                subject: 'Esportazione tabella Bike2Work',
                creator: 'Bike2Work App',
                author: 'Bike2Work'
            });
            
            // Aggiungi data e ora di esportazione
            const now = new Date();
            const dateStr = now.toLocaleDateString('it-IT');
            const timeStr = now.toLocaleTimeString('it-IT');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Esportato il ${dateStr} alle ${timeStr}`, 10, 10);
            
            // Aggiungi il titolo
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0);
            pdf.text(displayTitle, 105, 20, { align: 'center' });
            
            // Prepara i dati della tabella per jsPDF
            const tableElement = document.getElementById('data-table');
            
            // Usa html2canvas per catturare la tabella
            html2canvas(tableElement, {
                backgroundColor: 'white',
                scale: 2,
                logging: false
            }).then(canvas => {
                // Converti il canvas in un'immagine
                const imgData = canvas.toDataURL('image/png');
                
                // Calcola le dimensioni per adattare la tabella alla pagina
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const imgWidth = Math.min(pdfWidth - 20, canvas.width * 0.25);
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // Aggiungi l'immagine al PDF centrata
                const x = (pdfWidth - imgWidth) / 2;
                const y = 30; // Sotto il titolo
                
                pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                
                // Salva il PDF
                pdf.save(`tabella_${displayTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
                
                // Pulisci
                document.body.removeChild(loadingIndicator);
            }).catch(error => {
                console.error('Errore nell\'esportazione della tabella:', error);
                document.body.removeChild(loadingIndicator);
                showError('Si è verificato un errore durante l\'esportazione della tabella');
            });
        }
        
        function exportGraphAsPdf() {
            const isCheckbox = chartData.is_checkbox === true;
            
            // Ottieni il titolo corretto - ora sempre uguale al nome della colonna
            const displayTitle = chartData.column;
            
            // Prepara i dati per l'esportazione
            const labels = Object.keys(chartData.data);
            const values = Object.values(chartData.data);
            const chartType = currentChartType;
            
            // Adatta le dimensioni del contenitore in base alla lunghezza della legenda
            const hasLongLegend = labels.length > 15 || labels.some(label => label.length > 30);
            const useMultiColumnLegend = labels.length > 20;
            
            // Crea un contenitore temporaneo strutturato per l'esportazione
            const tempContainer = document.createElement('div');
            tempContainer.style.width = hasLongLegend ? '1000px' : '800px';
            tempContainer.style.height = hasLongLegend ? '750px' : '650px';
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '-9999px';
            tempContainer.style.backgroundColor = 'white';
            tempContainer.style.padding = '10px';
            tempContainer.style.boxSizing = 'border-box';
            document.body.appendChild(tempContainer);
            
            // Aggiungi un titolo centrato in alto
            const titleElement = document.createElement('div');
            titleElement.style.width = '100%';
            titleElement.style.textAlign = 'center';
            titleElement.style.fontSize = '24px';
            titleElement.style.fontWeight = 'bold';
            titleElement.style.marginBottom = '20px';
            titleElement.style.paddingTop = '10px';
            titleElement.style.paddingBottom = '5px';
            titleElement.style.borderBottom = '1px solid #ddd';
            titleElement.textContent = displayTitle;
            tempContainer.appendChild(titleElement);
            
            // Crea un contenitore per il grafico e la legenda
            const chartLegendContainer = document.createElement('div');
            chartLegendContainer.style.display = 'flex';
            chartLegendContainer.style.width = '100%';
            chartLegendContainer.style.height = 'calc(100% - 60px)'; // Sottrai lo spazio per il titolo
            tempContainer.appendChild(chartLegendContainer);
            
            // Area per il grafico (a sinistra)
            const chartArea = document.createElement('div');
            chartArea.style.width = hasLongLegend ? '60%' : '70%';
            chartArea.style.height = '100%';
            chartLegendContainer.appendChild(chartArea);
            
            // Canvas per il grafico
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = hasLongLegend ? 600 : 550;
            exportCanvas.height = hasLongLegend ? 600 : 550;
            chartArea.appendChild(exportCanvas);
            
            // Area per la legenda (a destra)
            const legendArea = document.createElement('div');
            legendArea.style.width = hasLongLegend ? '40%' : '30%';
            legendArea.style.paddingLeft = '15px';
            legendArea.style.height = '100%';
            legendArea.style.boxSizing = 'border-box';
            
            // Se ci sono molte etichette, usa un layout a più colonne
            if (useMultiColumnLegend) {
                legendArea.style.columnCount = '2';
                legendArea.style.columnGap = '20px';
            }
            
            chartLegendContainer.appendChild(legendArea);
            
            const colors = generateColors(labels.length);
            
            // Crea la legenda personalizzata
            if (chartType === 'bar') {
                // Non mostriamo più l'informazione che si tratta di risposte multiple
                
                // Crea le etichette della legenda
                labels.forEach((label, index) => {
                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.alignItems = 'flex-start';
                    item.style.marginBottom = '8px';
                    
                    // Indicatore di colore
                    const colorBox = document.createElement('span');
                    colorBox.style.display = 'inline-block';
                    colorBox.style.minWidth = '12px';
                    colorBox.style.height = '12px';
                    colorBox.style.backgroundColor = colors[index];
                    colorBox.style.marginRight = '8px';
                    colorBox.style.marginTop = '2px';
                    colorBox.style.flexShrink = '0';
                    
                    // Testo dell'etichetta
                    const labelText = document.createElement('span');
                    labelText.style.wordBreak = 'break-word';
                    labelText.style.lineHeight = '1.2';
                    labelText.style.fontSize = hasLongLegend ? '11px' : '12px';
                    
                    // Tronca etichette estremamente lunghe
                    const displayedLabel = label.length > 80 ? label.substring(0, 77) + '...' : label;
                    labelText.textContent = `${displayedLabel} (${values[index]})`;
                    
                    item.appendChild(colorBox);
                    item.appendChild(labelText);
                    
                    legendArea.appendChild(item);
                });
            }
            
            // Imposta le opzioni per l'esportazione
            const exportOptions = {
                responsive: false,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        display: chartType === 'pie' || chartType === 'doughnut',
                        position: 'right',
                        align: 'start',
                        labels: {
                            boxWidth: 15,
                            padding: 10,
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: false, // Nascondi il titolo del grafico, usiamo quello personalizzato
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            };
            
            // Aggiungi opzioni specifiche per i grafici a barre e linee
            if (chartType === 'bar' || chartType === 'line') {
                exportOptions.scales = {
                    x: {
                        ticks: {
                            display: chartType !== 'bar', // Nascondi le etichette per gli istogrammi
                            autoSkip: true,
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: chartType !== 'bar' // Nascondi la griglia per gli istogrammi
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                };
            }
            
            // Crea il grafico temporaneo per l'esportazione
            const ctx = exportCanvas.getContext('2d');
            const exportChart = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: chartType === 'bar' ? labels.map(() => '') : labels,
                    datasets: [{
                        label: displayTitle,
                        data: values,
                        backgroundColor: colors,
                        borderColor: 'white',
                        borderWidth: 1
                    }]
                },
                options: exportOptions
            });
            
            // Aspetta il render del grafico
            setTimeout(() => {
                // Crea un nuovo documento PDF
                const pdf = new jspdf.jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                // Aggiungi metadati al PDF
                pdf.setProperties({
                    title: `Grafico ${displayTitle}`,
                    subject: 'Esportazione grafico Bike2Work',
                    creator: 'Bike2Work App',
                    author: 'Bike2Work'
                });
                
                // Aggiungi data e ora di esportazione
                const now = new Date();
                const dateStr = now.toLocaleDateString('it-IT');
                const timeStr = now.toLocaleTimeString('it-IT');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`Esportato il ${dateStr} alle ${timeStr}`, 10, 10);
                
                // Usa html2canvas per catturare l'intero container con titolo, grafico e legenda
                html2canvas(tempContainer, {
                    backgroundColor: 'white',
                    scale: 2, // Migliora la qualità dell'immagine
                    logging: false,
                    useCORS: true
                }).then(canvas => {
                    // Converti il canvas in un'immagine
                    const imgData = canvas.toDataURL('image/png');
                    
                    // Calcola le dimensioni e la posizione corretta nel PDF
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    
                    // Calcola le dimensioni mantenendo le proporzioni
                    const ratio = canvas.width / canvas.height;
                    let imgWidth = pdfWidth - 20; // Margine di 10mm su ciascun lato
                    let imgHeight = imgWidth / ratio;
                    
                    // Se l'altezza è maggiore della pagina, adatta l'altezza
                    if (imgHeight > pdfHeight - 30) { // Margine di 15mm sopra e sotto
                        imgHeight = pdfHeight - 30;
                        imgWidth = imgHeight * ratio;
                    }
                    
                    // Calcola la posizione centrata
                    const x = (pdfWidth - imgWidth) / 2;
                    const y = 20; // Margine superiore di 20mm
                    
                    // Aggiungi l'immagine al PDF
                    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                    
                    // Salva il PDF
                    pdf.save(`grafico_${displayTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
                    
                    // Pulisci
                    document.body.removeChild(tempContainer);
                    document.body.removeChild(loadingIndicator);
                    exportChart.destroy();
                }).catch(error => {
                    console.error('Errore nell\'esportazione del grafico:', error);
                    document.body.removeChild(tempContainer);
                    document.body.removeChild(loadingIndicator);
                    exportChart.destroy();
                    showError('Si è verificato un errore durante l\'esportazione del grafico');
                });
            }, 500);
        }
    }
    
    /**
     * Mostra un messaggio di errore
     */
    function showError(message) {
        console.error(message);
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        exportPdfBtn.disabled = true;
    }
    
    /**
     * Genera un singolo colore casuale
     */
    function generateRandomColor() {
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(50 + Math.random() * 30); // 50-80%
        const l = Math.floor(40 + Math.random() * 20); // 40-60%
        return `hsl(${h}, ${s}%, ${l}%)`;
    }
    
    /**
     * Genera un array di colori distribuiti ordinatamente in stile arcobaleno
     */
    function generateColors(count) {
        const colors = [];
        
        // Punto di partenza dell'arcobaleno (un rosso vibrante)
        const startHue = 0;
        
        // Distribuzione uniforme nello spettro dei colori
        const hueStep = 360 / count;
        
        for (let i = 0; i < count; i++) {
            // Calcola la tonalità in base alla posizione
            const hue = (startHue + i * hueStep) % 360;
            
            // Saturazione e luminosità fisse per colori vivaci e distinti
            const saturation = 70; // Colori abbastanza saturi
            const lightness = 50;  // Luminosità media per buona visibilità
            
            // L'ordine dei colori sarà: rosso, arancione, giallo, verde, ciano, blu, viola, magenta, e così via
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }
        
        return colors;
    }
    
    /**
     * Genera una tabella in base alla colonna selezionata
     */
    function generateTable(column) {
        fetch(`/api/data?column=${encodeURIComponent(column)}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(`Errore ${response.status}: ${errData.error || 'Errore server'}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                const labels = Object.keys(data.data);
                const values = Object.values(data.data);
                
                if (labels.length === 0) {
                    showError(`La colonna "${column}" non contiene valori validi.`);
                    tableContainer.classList.add('hidden');
                    exportPdfBtn.disabled = true;
                    return;
                }
                
                // Nascondi messaggi di errore e mostra la tabella
                errorMessage.classList.add('hidden');
                tableContainer.classList.remove('hidden');
                exportPdfBtn.disabled = false;
                
                // Calcola il totale per le percentuali
                const total = values.reduce((sum, value) => sum + value, 0);
                
                // Crea la struttura della tabella
                const tableBody = dataTable.querySelector('tbody');
                tableBody.innerHTML = '';
                
                // Ordina i dati per conteggio decrescente
                const sortedData = labels.map((label, index) => ({
                    label: label,
                    value: values[index],
                    percentage: (values[index] / total) * 100
                })).sort((a, b) => b.value - a.value);
                
                // Popola la tabella
                sortedData.forEach(item => {
                    const row = document.createElement('tr');
                    
                    const labelCell = document.createElement('td');
                    labelCell.textContent = item.label;
                    
                    const valueCell = document.createElement('td');
                    valueCell.className = 'value-cell';
                    valueCell.textContent = item.value;
                    
                    const percentCell = document.createElement('td');
                    percentCell.className = 'percent-cell';
                    percentCell.textContent = `${item.percentage.toFixed(1)}%`;
                    
                    row.appendChild(labelCell);
                    row.appendChild(valueCell);
                    row.appendChild(percentCell);
                    
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Errore nella generazione della tabella:', error);
                showError(`Si è verificato un errore durante la generazione della tabella: ${error.message}`);
                exportPdfBtn.disabled = true;
            });
    }
}); 