import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import AddPatient from './components/AddPatient';
import PatientInfo from './components/PatientInfo';
import HospitalConnection from './components/HospitalConnection';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('hospitalId') !== null;
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <Router>
      <ToastContainer position="top-right" />
      <Routes>
        <Route path="/login" element={
          isAuthenticated() ? <Navigate to="/dashboard" /> : <Login />
        } />
        <Route path="/signup" element={
          isAuthenticated() ? <Navigate to="/dashboard" /> : <SignUp />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/add-patient" element={
          <ProtectedRoute>
            <AddPatient />
          </ProtectedRoute>
        } />
        <Route path="/patient-info" element={
          <ProtectedRoute>
            <PatientInfo />
          </ProtectedRoute>
        } />
        <Route path="/hospital-connection" element={
          <ProtectedRoute>
            <HospitalConnection />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          isAuthenticated() ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}

export default App;