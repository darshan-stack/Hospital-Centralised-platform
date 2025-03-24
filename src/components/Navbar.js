import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const hospitalId = localStorage.getItem('hospitalId');
  const hospitalName = localStorage.getItem('hospitalName');

  const handleLogout = () => {
    localStorage.removeItem('hospitalId');
    localStorage.removeItem('hospitalName');
    navigate('/auth');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                HealthcareApp
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/patient-info"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Patient Info
              </Link>
              <Link
                to="/insurances"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Insurances
              </Link>
              <Link
                to="/hospital-connection"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Hospital Connection
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Hospital ID:</span> {hospitalId}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Name:</span> {hospitalName}
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 