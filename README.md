# Bike2Work

Una dashboard interattiva per visualizzare dati relativi al progetto Bike2Work.

## Caratteristiche

- Visualizzazione di dati da file Excel
- Generazione di grafici interattivi (istogrammi, torte, ciambelle, aree polari)
- Ordinamento manuale delle etichette tramite drag and drop
- Esportazione dei grafici in formato PNG

## Requisiti

- Python 3.x
- Flask
- Pandas
- Openpyxl

## Installazione

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
   python app.py
   ```

4. Apri il browser all'indirizzo [http://localhost:5000](http://localhost:5000)

## Struttura del Progetto

- `app.py` - Applicazione Flask principale
- `templates/` - Template HTML
- `static/` - File statici (CSS, JavaScript)
- `Data source/` - Contiene il file Excel con i dati

## Utilizzo

1. Seleziona una colonna dal menu a tendina
2. Scegli il tipo di grafico
3. Clicca su "Genera Grafico"
4. Trascina le etichette per riordinare i dati nel grafico
5. Usa il pulsante "Esporta come PNG" per salvare il grafico come immagine

## Licenza

Questo progetto è distribuito con licenza MIT. 