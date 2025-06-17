from flask import Flask, jsonify, render_template, request
import pandas as pd
import os
import sys
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')

# Percorso del file Excel - modificato per essere più flessibile
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE = os.path.join(BASE_DIR, 'Data source', 'Risposte_unificate.xlsx')

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/columns')
def get_columns():
    """Return the list of columns in the Excel file"""
    try:
        # Verifica se il file esiste
        if not os.path.exists(EXCEL_FILE):
            app.logger.error(f"File non trovato: {EXCEL_FILE}")
            return jsonify({'error': f'File non trovato: {EXCEL_FILE}'}), 404
            
        app.logger.info(f"Caricamento file: {EXCEL_FILE}")
        df = pd.read_excel(EXCEL_FILE)
        columns = df.columns.tolist()
        return jsonify({'columns': columns})
    except Exception as e:
        app.logger.error(f"Errore nel caricamento delle colonne: {str(e)}")
        # Dettagli più specifici sull'errore per il debug
        error_type = type(e).__name__
        error_details = {
            'message': str(e),
            'type': error_type,
            'traceback': str(sys.exc_info()),
            'file_path': EXCEL_FILE,
            'file_exists': os.path.exists(EXCEL_FILE)
        }
        return jsonify({'error': str(e), 'details': error_details}), 500

@app.route('/api/data')
def get_data():
    """Return data for a specific column"""
    column = request.args.get('column', None)
    if not column:
        return jsonify({'error': 'No column specified'}), 400
    
    try:
        df = pd.read_excel(EXCEL_FILE)
        
        # Check if column exists
        if column not in df.columns:
            return jsonify({'error': f'Column {column} not found'}), 404
        
        # Special handling for Informazioni cronologiche (group by day)
        if column == 'Informazioni cronologiche':
            # Convert to datetime and extract date only
            df['Date_Only'] = pd.to_datetime(df[column]).dt.date
            
            # Group by date and count
            counts = df['Date_Only'].value_counts().sort_index()
            
            # Convert dates to strings for JSON serialization
            processed_values = {}
            for date, count in counts.items():
                date_str = date.strftime('%Y-%m-%d')  # Format: YYYY-MM-DD
                processed_values[date_str] = int(count)
            
            return jsonify({
                'column': column,
                'data': processed_values
            })
        else:
            # Standard handling for other columns
            values = df[column].value_counts().to_dict()
            
            # Convert any non-serializable objects to strings
            processed_values = {}
            for k, v in values.items():
                processed_values[str(k)] = v
            
            return jsonify({
                'column': column,
                'data': processed_values
            })
    except Exception as e:
        app.logger.error(f"Errore nel caricamento dei dati per la colonna {column}: {str(e)}")
        return jsonify({'error': str(e)}), 500
        

@app.route('/api/test')
def test_config():
    """Test route to verify configuration and file access"""
    try:
        config_info = {
            'base_dir': BASE_DIR,
            'excel_file_path': EXCEL_FILE,
            'file_exists': os.path.exists(EXCEL_FILE),
            'working_directory': os.getcwd(),
            'directory_contents': os.listdir(os.path.dirname(EXCEL_FILE)) if os.path.exists(os.path.dirname(EXCEL_FILE)) else None
        }
        return jsonify(config_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 