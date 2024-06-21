from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import logging
import os
import pandas as pd
import numpy as np
import re
import json
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
app.secret_key = os.environ.get('SECRET_KEY', 'supersecretkey')  # For session management

# Set up logging
logging.basicConfig(level=logging.INFO)

# In-memory user store for demo purposes
users = {
    "admin": generate_password_hash("adminpassword"),
    "employee": generate_password_hash("employeepassword")
}

# In-memory store for employee data and additional details
employee_data = []
admin_data = []
additional_details = {}


def markAsNew(data):
    data['isNew'] = True
    return data


@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username in users and check_password_hash(users[username], password):
        session['user'] = username
        session['role'] = 'admin' if username == 'admin' else 'employee'
        return jsonify({"message": "Login successful", "role": session['role']}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    session.pop('role', None)
    return jsonify({"message": "Logout successful"}), 200


@app.route('/api/data', methods=['POST'])
def get_data():
    if 'user' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    if data.get('data') == 'trigger':
        app.logger.info('Special input received!')
        response = {'alert': 'Special input received!'}
    else:
        response = {'data': data.get('data')}
    return jsonify(response)


def extract_numbers_before_mp(text):
    try:
        text = str(text)
        matches = re.findall(r'\b(\d+)\s*mp\b', text, re.IGNORECASE)
        if matches:
            return int(matches[0])
        else:
            return None
    except Exception as e:
        app.logger.error(f"Error occurred while extracting numbers before 'mp': {e}")
        return None


@app.route('/api/convert', methods=['GET'])
def convert_xlsx_to_json():
    if 'user' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    xlsx_path = os.path.join(os.path.dirname(__file__), '123.xlsx')
    try:
        app.logger.info(f"Loading Excel file from: {xlsx_path}")
        df = pd.read_excel(xlsx_path)

        # Log DataFrame to inspect its structure
        app.logger.info(f"DataFrame loaded: {df}")

        # Ensure correct column headers
        df.columns = ['ID', 'Zone', 'Price', 'Type', 'Square Meters', 'Description', 'Proprietor', 'Phone Number',
                      'Days Since Posted', 'Date and Time Posted']

        # Remove "EUR" from the Price column and keep only digits
        def clean_price(price):
            try:
                return float(price.replace(' EUR', '').replace('.', '').replace(',', '').strip())
            except (ValueError, AttributeError):
                return None  # Handle non-numeric prices gracefully

        df['Price'] = df['Price'].apply(clean_price)

        # Use extract_numbers_before_mp to clean "Square Meters" column
        df['Square Meters'] = df['Square Meters'].apply(extract_numbers_before_mp)

        # Replace NaN values with None (null in JSON)
        df = df.replace({np.nan: None})

        # Convert DataFrame to JSON
        json_data = df.to_dict(orient='records')

        # Log JSON Data
        app.logger.info(f"JSON Data: {json_data}")

        # Update the in-memory admin_data
        global admin_data
        admin_data = json_data

        # Return JSON response
        return jsonify(json_data)
    except Exception as e:
        app.logger.error('Error processing the XLSX file', exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/delete_row', methods=['POST'])
def delete_row():
    if 'user' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    row_id = data.get('id')

    xlsx_path = os.path.join(os.path.dirname(__file__), '123.xlsx')
    try:
        df = pd.read_excel(xlsx_path)
        df.columns = ['ID', 'Zone', 'Price', 'Type', 'Square Meters', 'Description', 'Proprietor', 'Phone Number',
                      'Days Since Posted', 'Date and Time Posted']

        # Delete the row from the DataFrame
        df = df[df['ID'] != row_id]

        # Save the updated DataFrame back to the Excel file
        df.to_excel(xlsx_path, index=False)

        # Update the in-memory admin_data
        global admin_data
        admin_data = df.to_dict(orient='records')

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error('Error deleting row from the XLSX file', exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/send_to_employee', methods=['POST'])
def send_to_employee():
    if 'user' not in session or session.get('role') != 'admin':
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()

    # Ensure the custom questions are added to the employee data
    custom_questions = data.get('questions', [])
    row_to_send = {**data, 'questions': custom_questions}

    global admin_data
    admin_data = [row for row in admin_data if row['ID'] != data['ID']]

    # Read existing json_call_center.json if it exists
    call_center_data = []
    call_center_file_path = os.path.join(os.path.dirname(__file__), 'json_call_center.json')
    if os.path.exists(call_center_file_path):
        with open(call_center_file_path, 'r') as file:
            call_center_data = json.load(file)

    # Add the new row to the call center data
    call_center_data.append(row_to_send)

    # Write the updated call center data back to the file
    with open(call_center_file_path, 'w') as file:
        json.dump(call_center_data, file, indent=4)

    return jsonify({'status': 'success'})


@app.route('/api/employee_data', methods=['GET'])
def get_employee_data():
    if 'user' not in session or session.get('role') not in ['employee', 'admin']:
        return jsonify({'message': 'Unauthorized'}), 401
    return jsonify(employee_data)


@app.route('/api/save_details', methods=['POST'])
def save_details():
    if 'user' not in session or session.get('role') != 'employee':
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.get_json()
    app.logger.info(f"Received data for saving: {data}")
    # Update the corresponding row in employee_data
    for i, row in enumerate(employee_data):
        if row['ID'] == data['ID']:
            data = markAsNew(data)
            employee_data[i] = data
            admin_data.append(data)
            employee_data.pop(i)  # Remove the updated row from employee_data
            app.logger.info(f"Updated data sent back to admin: {data}")
            break
    additional_details[data['ID']] = {
        "streetNumber": data.get('streetNumber'),
        "additionalDetails": data.get('additionalDetails')
    }
    app.logger.info(f"Additional details saved: {additional_details[data['ID']]}")
    return jsonify({'status': 'success'})


@app.route('/api/get_additional_details', methods=['GET'])
def get_additional_details():
    if 'user' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    row_id = request.args.get('id')
    details = additional_details.get(int(row_id), {})
    app.logger.info(f"Fetched additional details for ID {row_id}: {details}")
    return jsonify(details)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
