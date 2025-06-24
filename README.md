# Bike2Work

Dashboard interattiva per visualizzare e analizzare i dati raccolti dal progetto Bike2Work.

## Caratteristiche

- **Visualizzazione dati dinamica**: Analisi di dati estratti da file Excel in formato tabellare o grafico
- **Grafici interattivi**: Supporto per istogrammi, grafici a torta e a ciambella
- **Ordinamento flessibile**: Riordinamento delle etichette tramite drag and drop
- **Esportazione PDF**: Possibilità di esportare grafici e tabelle in formato PDF
- **Interfaccia moderna**: Design responsive con controlli intuitivi
- **Gestione errori**: Messaggi informativi quando mancano dati o si verificano problemi

## Requisiti

- Python 3.x (solo se esegui senza Docker)
- Flask, Pandas, Openpyxl, ecc. (vedi requirements.txt)
- Oppure **solo Docker** se vuoi usare i container
- Browser web moderno

## Installazione manuale (senza Docker)

1. Clona il repository:
   ```
   git clone https://github.com/Dr-Marshmallow/Bike2Work.git
   cd Bike2Work
   ```

2. Installa le dipendenze:
   ```
   pip install -r requirements.txt
   ```

3. Esegui l'applicazione:
   ```
   flask run
   ```
   oppure
   ```
   python -m flask run
   ```

4. Apri il browser all'indirizzo [http://localhost:5000](http://localhost:5000)

## Esecuzione con Docker

1. Costruisci l'immagine:
   ```
   docker build -t bike2work .
   ```
2. Avvia il container mappando la porta 7000 dell'host sulla 5000 del container:
   ```
   docker run --name Bike2Work -p 7000:5000 --restart always bike2work
   ```
3. Apri il browser su [http://localhost:7000](http://localhost:7000)

## Esecuzione con Docker Compose

1. Assicurati di avere Docker e Docker Compose installati.
2. Avvia l'applicazione con:
   ```
   docker compose up --build
   ```
   Questo comando:
   - Costruisce l'immagine se necessario
   - Avvia il container con nome `Bike2Work`
   - Mappa la porta 7000 dell'host sulla 5000 del container
   - Riavvia automaticamente il container in caso di errore o riavvio del sistema

3. Apri il browser su [http://localhost:7000](http://localhost:7000)

## Struttura del Progetto

- `app.py` - Applicazione Flask principale che gestisce le API e il routing
- `templates/` - Template HTML per l'interfaccia utente
  - `index.html` - Pagina principale dell'applicazione
- `static/` - File statici
  - `css/styles.css` - Stili dell'interfaccia utente
  - `js/main.js` - Funzionalità JavaScript per l'interattività
- `Data source/` - Contiene il file Excel con i dati di origine

## Utilizzo

1. **Selezione dati**: Seleziona una colonna dal menu a tendina per visualizzarne i dati
2. **Scelta visualizzazione**: Seleziona il tipo di visualizzazione preferita (istogramma, grafico a torta, grafico a ciambella, tabella)
3. **Riordino dati**: Trascina le etichette nella sezione "Ordinamento delle etichette" per modificare l'ordine di visualizzazione
4. **Esportazione**: Utilizza il pulsante "Esporta come PDF" sotto il grafico/tabella per creare un documento PDF

## Funzionalità Tecniche

- **API REST**: Endpoint per accedere ai dati in formato JSON
- **Rendering lato client**: Utilizzo di Chart.js per la generazione dinamica dei grafici
- **Drag and Drop**: Implementazione basata su SortableJS per il riordino intuitivo
- **Esportazione PDF**: Generazione PDF tramite jsPDF e html2canvas
- **Gestione degli errori**: Validazione dei dati e feedback visuale all'utente

## Sviluppi Futuri

- Supporto per l'analisi di più colonne contemporaneamente
- Filtri avanzati per i dati
- Modalità di confronto tra diverse visualizzazioni
- Salvataggio delle configurazioni preferite dell'utente
- Supporto per l'importazione di file Excel personalizzati

## Licenza

Questo progetto è distribuito con licenza MIT.

## Contatti

Per informazioni, feedback o segnalazioni, contattare il team di sviluppo. 