import React, { useState, useEffect } from 'react';
import './App.css';
import Toast from './components/Toast';

interface User {
  id: number;
  name: string;
  balance: number;
}

interface Expense {
  id: number;
  amount: number;
  date: string;
  description: string;
  selectedUsers: number[];
}

interface UserBalanceHistory {
  userId: number;
  previousBalance: number;
  timestamp: number;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    selectedUsers: [] as number[]
  });
  const [paymentAmounts, setPaymentAmounts] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<UserBalanceHistory[]>([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const savedUsers = localStorage.getItem('users');
      const savedExpenses = localStorage.getItem('expenses');
      
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      }
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
      setSaveStatus('Data loaded successfully');
      setToast({ message: 'Data loaded successfully', type: 'success' });
    } catch (error) {
      console.error('Error loading data:', error);
      setSaveStatus('Error loading data');
      setToast({ message: 'Error loading data', type: 'error' });
    }
  };

  const saveData = () => {
    try {
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('expenses', JSON.stringify(expenses));
      setSaveStatus('Data saved successfully');
      setToast({ message: 'Data saved successfully', type: 'success' });
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveStatus('Error saving data');
      setToast({ message: 'Error saving data', type: 'error' });
    }
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.removeItem('users');
      localStorage.removeItem('expenses');
      setUsers([]);
      setExpenses([]);
      setSaveStatus('Data cleared successfully');
      setToast({ message: 'Data cleared successfully', type: 'success' });
    }
  };

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim() === '') return;

    const newUser: User = {
      id: Date.now(),
      name: newUserName.trim(),
      balance: 0
    };

    setUsers(prevUsers => [...prevUsers, newUser]);
    setNewUserName('');
    saveData(); // Save after adding user
  };

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (newExpense.amount === '' || newExpense.selectedUsers.length === 0) return;

    const amount = parseFloat(newExpense.amount);
    const perPerson = amount / newExpense.selectedUsers.length;

    const expense: Expense = {
      id: Date.now(),
      amount,
      date: new Date().toISOString(),
      description: newExpense.description,
      selectedUsers: newExpense.selectedUsers
    };

    setExpenses(prevExpenses => [...prevExpenses, expense]);

    // Update user balances
    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user => {
        if (newExpense.selectedUsers.includes(user.id)) {
          return { ...user, balance: user.balance + perPerson };
        }
        return user;
      });
      return updatedUsers;
    });

    setNewExpense({
      amount: '',
      description: '',
      selectedUsers: []
    });
    saveData(); // Save after adding expense
  };

  const handlePaymentInputChange = (userId: number, value: string) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const recordPayment = (userId: number) => {
    const amountStr = paymentAmounts[userId];
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    
    const user = users.find(u => u.id === userId);
    if (!user || amount > user.balance) return;
    
    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user => {
        if (user.id === userId) {
          return { ...user, balance: user.balance - amount };
        }
        return user;
      });
      return updatedUsers;
    });
    
    setPaymentAmounts(prev => ({
      ...prev,
      [userId]: ''
    }));
    saveData(); // Save after recording payment
  };

  const toggleUserSelection = (userId: number) => {
    setNewExpense(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
  };

  const settleUserBalance = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (window.confirm(`Are you sure you want to settle ${user.name}'s balance? This will set their balance to 0.`)) {
      // Store the previous balance in history
      setBalanceHistory(prev => [...prev, {
        userId,
        previousBalance: user.balance,
        timestamp: Date.now()
      }]);

      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, balance: 0 } : user
      ));
      setPaymentAmounts(prev => {
        const newAmounts = { ...prev };
        delete newAmounts[userId];
        return newAmounts;
      });
      setToast({ message: `${user.name}'s balance settled successfully`, type: 'success' });
      saveData();
    }
  };

  const undoLastSettlement = () => {
    const lastSettlement = balanceHistory[balanceHistory.length - 1];
    if (!lastSettlement) return;

    const user = users.find(u => u.id === lastSettlement.userId);
    if (!user) return;

    setUsers(prevUsers => prevUsers.map(user => 
      user.id === lastSettlement.userId 
        ? { ...user, balance: lastSettlement.previousBalance } 
        : user
    ));

    setBalanceHistory(prev => prev.slice(0, -1));
    setToast({ 
      message: `${user.name}'s balance restored to LKR ${lastSettlement.previousBalance.toFixed(2)}`, 
      type: 'success' 
    });
    saveData();
  };

  return (
    <div className="App">
      <h1>Payment Splitter</h1>
      
      <div className="compact-container">
        <div className="left-sidebar">
          {/* Add User Form */}
          <div className="section">
            <h2>Add New User</h2>
            <form onSubmit={addUser} className="form">
              <div className="form-row">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter user name"
                  className="input"
                />
                <button type="submit" className="button primary">Add</button>
              </div>
            </form>
          </div>

          {/* Add Expense Form */}
          <div className="section">
            <h2>Add New Expense</h2>
            <form onSubmit={addExpense} className="form">
              <div className="form-row">
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="Amount"
                  className="input"
                  step="0.01"
                  min="0"
                />
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Description"
                  className="input"
                />
                <button type="submit" className="button primary">Add</button>
              </div>
              <div className="user-selection">
                <table className="user-table">
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <label className="user-checkbox">
                            <input
                              type="checkbox"
                              checked={newExpense.selectedUsers.includes(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                            />
                            {user.name}
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </form>
          </div>

          
        </div>

        <div className="right-content">
          {/* User List with Balances */}
          <div className="section">
            <div className="section-header">
              <h2>User Balances</h2>
              {balanceHistory.length > 0 && (
                <button 
                  className="button outline"
                  onClick={undoLastSettlement}
                >
                  Undo Last Settlement
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td className={`balance ${user.balance > 0 ? 'positive' : user.balance < 0 ? 'negative' : ''}`}>
                      LKR {user.balance.toFixed(2)}
                    </td>
                    <td>
                      <div className="payment-form">
                        {user.balance > 0 && (
                          <>
                            <input
                              type="number"
                              placeholder="Amount"
                              className="input small"
                              min="0"
                              max={user.balance}
                              step="0.01"
                              value={paymentAmounts[user.id] || ''}
                              onChange={(e) => handlePaymentInputChange(user.id, e.target.value)}
                            />
                            <button 
                              className="button secondary"
                              onClick={() => recordPayment(user.id)}
                            >
                              Pay
                            </button>
                          </>
                        )}
                        {user.balance !== 0 && (
                          <div className="button-group">
                            <button 
                              className="button outline"
                              onClick={() => settleUserBalance(user.id)}
                            >
                              Settle
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expense History */}
          <div className="section">
            <h2>Expense History</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Users</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.date).toLocaleDateString()}</td>
                    <td>{expense.description}</td>
                    <td>LKR {expense.amount.toFixed(2)}</td>
                    <td>{expense.selectedUsers.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Data Management Buttons */}
          <div className="section">
            <div className="data-management">
              <button onClick={saveData} className="button primary">Save Data</button>
              <button onClick={loadData} className="button secondary">Load Data</button>
              <button onClick={clearData} className="button danger">Clear Data</button>
              <span className="save-status">{saveStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
