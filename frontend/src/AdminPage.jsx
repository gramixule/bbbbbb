import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CustomTableComponent from './CustomTableComponent';
import Modal from './Modal'; // Import the Modal component
import './AdminPage.css'; // Ensure this path is correct

const AdminPage = ({ rowData }) => {
  const [data, setData] = useState(rowData);
  const [selectedRow, setSelectedRow] = useState(null); // State for selected row
  const [showModal, setShowModal] = useState(false); // State for showing modal
  const [section, setSection] = useState(1); // State for section navigation
  const [customQuestion, setCustomQuestion] = useState(''); // State for custom question
  const [responseType, setResponseType] = useState('text'); // State for response type
  const [customQuestions, setCustomQuestions] = useState([]); // State for storing custom questions
  const [possibleResponses, setPossibleResponses] = useState(['']); // State for possible responses in multiple choice
  const [cut, setCut] = useState(0.2); // State for CUT value
  const [pot, setPot] = useState(15); // State for POT value
  const [squareMeters, setSquareMeters] = useState(0); // State for square meters value
  const [price, setPrice] = useState(0); // State for price value
  const [questionResponses, setQuestionResponses] = useState({}); // State for question responses

  useEffect(() => {
    if (selectedRow) {
      setSquareMeters(selectedRow['Square Meters']);
      setPrice(selectedRow.Price);
    }
  }, [selectedRow]);

  useEffect(() => {
    // Fetch data if not provided
    if (!rowData.length) {
      console.log("No rowData provided, fetching data from API...");
      fetchAdminData();
    } else {
      console.log("Using provided rowData:", rowData);
      setData(rowData.map(item => ({
        ...item,
        pricePerSquareMeter: calculatePricePerSquareMeter(item.Price, item['Square Meters'])
      })));
    }
  }, [rowData]);

  const fetchAdminData = () => {
    axios.get('http://localhost:5000/api/admin_data', { withCredentials: true })
      .then(response => {
        console.log("Admin data fetched:", response.data);
        const dataWithPricePerSquareMeter = response.data.map(item => ({
          ...item,
          pricePerSquareMeter: calculatePricePerSquareMeter(item.Price, item['Square Meters'])
        }));
        setData(dataWithPricePerSquareMeter);
      })
      .catch(error => {
        console.error('There was an error fetching the admin data!', error);
      });
  };

  const calculatePricePerSquareMeter = (price, squareMeters) => {
    return squareMeters ? (price / squareMeters).toFixed(2) : 0;
  };

  const handleDelete = (id) => {
    axios.post('http://localhost:5000/api/delete_row', { id }, { withCredentials: true })
      .then(response => {
        console.log(`Deleted row with ID: ${id}`);
        setData(data.filter(row => row.ID !== id));
      })
      .catch(error => {
        console.error('There was an error deleting the row!', error);
      });
  };

  const handleYes = (row) => {
    console.log('Yes clicked for row:', row);
    const questionsToSend = customQuestions.filter(q => q.checked); // Filter questions marked with Yes
    setSelectedRow({ ...row, questions: questionsToSend });
    setShowModal(true);
  };

  const handleSendToEmployee = () => {
    if (!selectedRow) return;

    const updatedRow = {
      ...selectedRow,
      questions: customQuestions.filter(q => q.checked) // Include only the checked questions
    };

    axios.post('http://localhost:5000/api/send_to_employee', updatedRow, { withCredentials: true })
      .then(response => {
        if (response.data.status === 'success') {
          setData(data.filter(r => r.ID !== updatedRow.ID)); // Remove the row from admin data
          handleCloseModal();
        } else {
          console.error('Error sending to employee:', response.data.error);
        }
      })
      .catch(error => {
        console.error('There was an error sending to employee!', error);
      });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRow(null);
    setSection(1); // Reset to Section 1 when modal closes
  };

  const addCustomQuestion = () => {
    setCustomQuestions([...customQuestions, { question: customQuestion, type: responseType, responses: possibleResponses, checked: false }]);
    setCustomQuestion('');
    setResponseType('text');
    setPossibleResponses(['']);
  };

  const handleResponseChange = (index, value) => {
    const newResponses = [...possibleResponses];
    newResponses[index] = value;
    setPossibleResponses(newResponses);
  };

  const addResponseField = () => {
    setPossibleResponses([...possibleResponses, '']);
  };

  const toggleQuestionCheck = (index) => {
    const updatedQuestions = customQuestions.map((q, i) => {
      if (i === index) {
        return { ...q, checked: !q.checked };
      }
      return q;
    });
    setCustomQuestions(updatedQuestions);
  };

  const handleQuestionResponse = (questionKey, value) => {
    setQuestionResponses(prevState => ({
      ...prevState,
      [questionKey]: value
    }));
  };

  const calculateMetrics = () => {
    const totalLand = squareMeters;
    const landOccupation = (pot / 100) * totalLand;
    const usageCoefficient = cut * totalLand;
    const unoccupiedLand = totalLand - landOccupation;
    const pricePerSquareMeter = price / totalLand;
    const constructionCostPerSquareMeter = 1000;
    const totalConstructionCost = constructionCostPerSquareMeter * usageCoefficient;
    const totalInvestmentCost = totalConstructionCost + price;
    const sellingPricePerSquareMeter = (totalInvestmentCost * 1.3) / usageCoefficient;
    const marketSellingPricePerSquareMeter = 2800;
    const profitDifference = marketSellingPricePerSquareMeter - sellingPricePerSquareMeter;

    return {
      totalLand,
      landOccupation,
      usageCoefficient,
      unoccupiedLand,
      pricePerSquareMeter,
      constructionCostPerSquareMeter,
      totalConstructionCost,
      totalInvestmentCost,
      sellingPricePerSquareMeter,
      marketSellingPricePerSquareMeter,
      profitDifference,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="admin-page">
      <h1>Admin Page</h1>
      <CustomTableComponent
        data={data}
        onDelete={handleDelete}
        onYes={handleYes}
        isEmployeePage={false}
      />
      {showModal && selectedRow && (
        <Modal show={showModal} onClose={handleCloseModal}>
          <div className="details-section">
            {section === 1 ? (
              <>
                <div className="details-left">
                  <div className="details-upper">
                    <h3>Row Details</h3>
                    <p><strong>Zone:</strong> {selectedRow.Zone}</p>
                    <p><strong>Price:</strong> {selectedRow.Price}</p>
                    <p><strong>Phone Number:</strong> {selectedRow['Phone Number']}</p>
                    <p><strong>Description:</strong> {selectedRow.Description}</p>
                  </div>
                  <div className="details-lower">
                    <h3>Additional Details</h3>
                    <p><strong>Street Number:</strong> {selectedRow.streetNumber}</p>
                    <p><strong>Additional Details:</strong> {selectedRow.additionalDetails}</p>
                  </div>
                </div>
                <div className="details-right">
                  <h3>Additional Information</h3>
                  <form>
                    <label>
                      <span>1) Vecin Direct</span>
                      <span>
                        <input
                          type="radio"
                          name="vecinDirect"
                          value="da"
                          checked={questionResponses['vecinDirect'] === 'da'}
                          onChange={(e) => handleQuestionResponse('vecinDirect', 'da')}
                        /> Da
                        <input
                          type="radio"
                          name="vecinDirect"
                          value="nu"
                          checked={questionResponses['vecinDirect'] === 'nu'}
                          onChange={(e) => handleQuestionResponse('vecinDirect', 'nu')}
                        /> Nu
                      </span>
                    </label>
                    <label>
                      <span>2) Proprietatea este in indiviziune?</span>
                      <span>
                        <input
                          type="radio"
                          name="indiviziune"
                          value="da"
                          checked={questionResponses['indiviziune'] === 'da'}
                          onChange={(e) => handleQuestionResponse('indiviziune', 'da')}
                        /> Da
                        <input
                          type="radio"
                          name="indiviziune"
                          value="nu"
                          checked={questionResponses['indiviziune'] === 'nu'}
                          onChange={(e) => handleQuestionResponse('indiviziune', 'nu')}
                        /> Nu
                      </span>
                    </label>
                    <label>
                      <span>3) Detineti un certificat de urbanism pentru informare in legatura cu coeficientii urbanistici actuali?</span>
                      <span>
                        <input
                          type="radio"
                          name="certificatUrbanism"
                          value="da"
                          checked={questionResponses['certificatUrbanism'] === 'da'}
                          onChange={(e) => handleQuestionResponse('certificatUrbanism', 'da')}
                        /> Da
                        <input
                          type="radio"
                          name="certificatUrbanism"
                          value="nu"
                          checked={questionResponses['certificatUrbanism'] === 'nu'}
                          onChange={(e) => handleQuestionResponse('certificatUrbanism', 'nu')}
                        /> Nu
                      </span>
                    </label>
                    <label>
                      <span>4) Cadastru</span>
                      <span>
                        <input
                          type="radio"
                          name="cadastru"
                          value="da"
                          checked={questionResponses['cadastru'] === 'da'}
                          onChange={(e) => handleQuestionResponse('cadastru', 'da')}
                        /> Da
                        <input
                          type="radio"
                          name="cadastru"
                          value="nu"
                          checked={questionResponses['cadastru'] === 'nu'}
                          onChange={(e) => handleQuestionResponse('cadastru', 'nu')}
                        /> Nu
                      </span>
                    </label>
                    <label>
                      <span>5) Schite Proprietate - teren</span>
                      <span>
                        <input
                          type="radio"
                          name="schiteProprietate"
                          value="da"
                          checked={questionResponses['schiteProprietate'] === 'da'}
                          onChange={(e) => handleQuestionResponse('schiteProprietate', 'da')}
                        /> Da
                        <input
                          type="radio"
                          name="schiteProprietate"
                          value="nu"
                          checked={questionResponses['schiteProprietate'] === 'nu'}
                          onChange={(e) => handleQuestionResponse('schiteProprietate', 'nu')}
                        /> Nu
                      </span>
                    </label>
                    {customQuestions.map((q, index) => (
                      <div key={index}>
                        <label>
                          <input type="checkbox" checked={q.checked} onChange={() => toggleQuestionCheck(index)} />
                          {q.question}
                        </label>
                        {q.type === 'text' ? (
                          <input type="text" />
                        ) : (
                          q.responses.map((response, i) => (
                            <label key={i}>
                              <input type="radio" name={`custom-${index}`} value={response} /> {response}
                            </label>
                          ))
                        )}
                      </div>
                    ))}
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="details-left">
                  <h3>Additional Information</h3>
                  <form>
                    <label>
                      <span>CUT</span>
                      <input type="number" name="cut" value={cut} onChange={(e) => setCut(parseFloat(e.target.value))} />
                    </label>
                    <label>
                      <span>POT</span>
                      <input type="number" name="pot" value={pot} onChange={(e) => setPot(parseFloat(e.target.value))} />
                    </label>
                    <label>
                      <span>Square Meters</span>
                      <input type="number" name="squareMeters" value={squareMeters} onChange={(e) => setSquareMeters(parseFloat(e.target.value))} />
                    </label>
                    <label>
                      <span>Price</span>
                      <input type="number" name="price" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
                    </label>
                    <label>
                      <span>Custom Question</span>
                      <input type="text" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} />
                    </label>
                    <label>
                      <span>Type of Response</span>
                      <select value={responseType} onChange={(e) => setResponseType(e.target.value)}>
                        <option value="text">Text</option>
                        <option value="multipleChoice">Multiple Choice</option>
                      </select>
                    </label>
                    {responseType === 'multipleChoice' && (
                      <>
                        {possibleResponses.map((response, index) => (
                          <input
                            key={index}
                            type="text"
                            value={response}
                            onChange={(e) => handleResponseChange(index, e.target.value)}
                          />
                        ))}
                        <button type="button" onClick={addResponseField}>Add Response</button>
                      </>
                    )}
                    <button type="button" onClick={addCustomQuestion}>Add Question</button>
                  </form>
                </div>
                <div className="details-right">
                  <h3>Calculation Results</h3>
                  <p><strong>Total Land:</strong> {metrics.totalLand} mp</p>
                  <p><strong>Land Occupation (POT):</strong> {metrics.landOccupation} mp</p>
                  <p><strong>Usage Coefficient (CUT):</strong> {metrics.usageCoefficient} mp</p>
                  <p><strong>Unoccupied Land:</strong> {metrics.unoccupiedLand} mp</p>
                  <p><strong>Price per Square Meter:</strong> {metrics.pricePerSquareMeter} euro/mp</p>
                  <p><strong>Construction Cost per Square Meter:</strong> {metrics.constructionCostPerSquareMeter} euro/mp</p>
                  <p><strong>Total Construction Cost:</strong> {metrics.totalConstructionCost} euro</p>
                  <p><strong>Total Investment Cost:</strong> {metrics.totalInvestmentCost} euro</p>
                  <p><strong>Selling Price per Square Meter:</strong> {metrics.sellingPricePerSquareMeter} euro/mp</p>
                  <p><strong>Market Selling Price per Square Meter:</strong> {metrics.marketSellingPricePerSquareMeter} euro/mp</p>
                  <p><strong>Profit Difference:</strong> {metrics.profitDifference} euro/mp</p>
                </div>
              </>
            )}
          </div>
          <div className="section-buttons">
            <button onClick={() => setSection(1)} disabled={section === 1}>Section 1</button>
            <button onClick={() => setSection(2)} disabled={section === 2}>Section 2</button>
            <button onClick={handleSendToEmployee} className="btn-send-to-employee">Send to Employee</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPage;
