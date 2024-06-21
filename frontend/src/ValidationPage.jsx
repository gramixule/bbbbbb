import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CustomButtonComponent from './CustomButtonComponent'; // Import the CustomButtonComponent
import './ValidationPage.css';

const ValidationPage = () => {
  const [employeeData, setEmployeeData] = useState([]);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = () => {
    axios.get('http://localhost:5000/api/employee_data', { withCredentials: true })
      .then(response => {
        console.log("Employee data fetched:", response.data);
        setEmployeeData(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the employee data!', error);
      });
  };

  const handleDelete = (id) => {
    axios.delete(`http://localhost:5000/api/delete/${id}`, { withCredentials: true })
      .then(response => {
        console.log(`Deleted row with ID: ${id}`);
        setEmployeeData(employeeData.filter(row => row.ID !== id));
      })
      .catch(error => {
        console.error('There was an error deleting the row!', error);
      });
  };

  const handleYes = (row) => {
    console.log('Yes clicked for row:', row);
    // Handle yes logic here, similar to AdminPage if needed
  };

  const handleSendToEmployee = (row) => {
    axios.post('http://localhost:5000/api/send_to_employee', row, { withCredentials: true })
      .then(response => {
        console.log('Row sent to employee:', row);
        setEmployeeData(employeeData.filter(data => data.ID !== row.ID)); // Remove from validation page after sending to employee
      })
      .catch(error => {
        console.error('There was an error sending the row to employee!', error);
      });
  };

  return (
    <div className="validation-container">
      <h1>Validation Page</h1>
      <h2>Properties Sent by Employees</h2>
      <table className="custom-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Zone</th>
            <th>Price</th>
            <th>Type</th>
            <th>Square Meters</th>
            <th>Description</th>
            <th>Proprietor</th>
            <th>Phone Number</th>
            <th>Days Since Posted</th>
            <th>Date and Time Posted</th>
            <th>Actions</th> {/* Add Actions column */}
          </tr>
        </thead>
        <tbody>
          {employeeData.map((row, index) => (
            <tr key={row.ID} className={index % 2 === 0 ? "even-row" : "odd-row"}>
              <td>{row.ID}</td>
              <td>{row.Zone}</td>
              <td>{row.Price}</td>
              <td>{row.Type}</td>
              <td>{row['Square Meters']}</td>
              <td>{row.Description}</td>
              <td>{row.Proprietor}</td>
              <td>{row['Phone Number']}</td>
              <td>{row['Days Since Posted']}</td>
              <td>{row['Date and Time Posted']}</td>
              <td>
                <CustomButtonComponent
                  row={row}
                  onDelete={handleDelete}
                  onYes={handleYes}
                  onSendToEmployee={handleSendToEmployee}
                  isEmployeePage={false} // Assuming validation page has similar buttons to admin page
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ValidationPage;
