import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

function Dashboard() {
  const navigate = useNavigate();
  const [hospitalId, setHospitalId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [beds, setBeds] = useState({
    General: { total: 100, available: 45 },
    Private: { total: 50, available: 20 },
    ICU: { total: 20, available: 5 },
    Emergency: { total: 10, available: 3 }
  });
  const [patientData, setPatientData] = useState({
    abhaId: '',
    mobileNumber: '',
    uniqueId: '',
    name: '',
    age: '',
    gender: '',
    medicalHistory: '',
    admissionDate: new Date().toISOString().split('T')[0],
    wardType: 'General',
    bedNumber: '',
    status: 'Admitted',
    contact: '',
    address: '',
    emergencyContact: '',
    currentMedications: '',
    allergies: '',
    photo: null
  });
  const [totalPatients, setTotalPatients] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [doctorAvailability, setDoctorAvailability] = useState({});
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    department: '',
    specialization: '',
    experience: '',
    availability: 'Available',
    contact: '',
    email: ''
  });

  const departments = [
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Neurology',
    'Emergency',
    'Surgery',
    'Oncology'
  ];

  useEffect(() => {
    const storedHospitalId = localStorage.getItem('hospitalId');
    const storedHospitalName = localStorage.getItem('hospitalName');
    setHospitalId(storedHospitalId || '');
    setHospitalName(storedHospitalName || '');

    // Subscribe to beds collection
    const bedsRef = doc(db, 'beds', 'bedStatus');
    const unsubscribeBeds = onSnapshot(bedsRef, (doc) => {
      if (doc.exists()) {
        setBeds(doc.data());
      }
    });

    // Subscribe to patients collection
    const patientsRef = collection(db, 'patients');
    const unsubscribePatients = onSnapshot(patientsRef, (snapshot) => {
      setTotalPatients(snapshot.docs.length);
    });

    // Subscribe to doctors collection
    const doctorsRef = collection(db, 'doctors');
    const unsubscribeDoctors = onSnapshot(doctorsRef, (snapshot) => {
      const doctorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDoctors(doctorsData);
    });

    // Subscribe to notifications
    const notificationsRef = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubscribeNotifications = onSnapshot(notificationsRef, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setNotifications(notificationsData);

      // Show toast for new notifications
      const latestNotification = notificationsData[0];
      if (latestNotification && !latestNotification.read) {
        toast.info(latestNotification.message, {
          position: "top-right",
          autoClose: 5000
        });
      }
    });

    return () => {
      unsubscribeBeds();
      unsubscribePatients();
      unsubscribeDoctors();
      unsubscribeNotifications();
    };
  }, []);

  // Fetch hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const hospitalsRef = collection(db, 'hospitals');
        const unsubscribe = onSnapshot(hospitalsRef, (snapshot) => {
          const hospitalsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHospitals(hospitalsData);
        });
        return () => unsubscribe();
      } catch (err) {
        toast.error('Error fetching hospitals: ' + err.message);
      }
    };
    fetchHospitals();
  }, []);

  // Fetch doctor availability
  useEffect(() => {
    const fetchDoctorAvailability = async () => {
      try {
        const doctorsRef = collection(db, 'doctors');
        const unsubscribe = onSnapshot(doctorsRef, (snapshot) => {
          const doctorsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          const availability = departments.reduce((acc, dept) => {
            const deptDoctors = doctorsData.filter(doc => doc.department === dept);
            acc[dept] = {
              total: deptDoctors.length,
              available: deptDoctors.filter(doc => doc.availability === 'Available').length,
              doctors: deptDoctors.map(doc => ({
                name: doc.name,
                status: doc.availability,
                nextAvailable: doc.nextAvailable || null
              }))
            };
            return acc;
          }, {});
          
          setDoctorAvailability(availability);
        });
        return () => unsubscribe();
      } catch (err) {
        toast.error('Error fetching doctor availability: ' + err.message);
      }
    };
    fetchDoctorAvailability();
  }, [departments]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPatientData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateBedCount = async (wardType) => {
    try {
      const bedDocRef = doc(db, 'beds', 'bedStatus');
      
      const updatedBeds = {
        ...beds,
        [wardType]: {
          ...beds[wardType],
          available: beds[wardType].available - 1
        }
      };
      
      await updateDoc(bedDocRef, updatedBeds);
      setBeds(updatedBeds);
    } catch (err) {
      console.error('Error updating bed count:', err);
      throw err;
    }
  };

  // Function to start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error('Could not access camera');
    }
  };

  // Function to stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Function to capture photo
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const photoUrl = canvas.toDataURL('image/jpeg');
    setPatientData(prev => ({ ...prev, photo: photoUrl }));
    stopCamera();
  };

  // Function to handle file upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPatientData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    
    try {
      // Validate bed number format
      const bedNumberPattern = /^[A-Z0-9]+$/;
      if (!bedNumberPattern.test(patientData.bedNumber)) {
        toast.error('Invalid bed number format. Use uppercase letters and numbers only.');
        return;
      }

      // Check if patient with ABHA ID already exists
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, where('abhaId', '==', patientData.abhaId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast.error('Patient with this ABHA ID already exists');
        return;
      }

      // Check bed availability
      if (beds[patientData.wardType].available === 0) {
        toast.error('No beds available in selected ward');
        return;
      }

      // Check if bed number is already occupied
      const bedQuery = query(patientsRef, 
        where('wardType', '==', patientData.wardType),
        where('bedNumber', '==', patientData.bedNumber),
        where('status', '==', 'Admitted')
      );
      const bedSnapshot = await getDocs(bedQuery);
      
      if (!bedSnapshot.empty) {
        toast.error('This bed is already occupied');
        return;
      }

      // Add patient to Firestore
      const patientDocRef = await addDoc(patientsRef, {
        ...patientData,
        createdAt: new Date().toISOString(),
        status: 'Admitted',
        hospitalId: hospitalId
      });

      // Update bed count
      await updateBedCount(patientData.wardType);

      toast.success('Patient added successfully!');
      setShowAddPatientModal(false);
      
      // Reset form
      setPatientData({
        abhaId: '',
        mobileNumber: '',
        uniqueId: '',
        name: '',
        age: '',
        gender: '',
        medicalHistory: '',
        admissionDate: new Date().toISOString().split('T')[0],
        wardType: 'General',
        bedNumber: '',
        status: 'Admitted',
        contact: '',
        address: '',
        emergencyContact: '',
        currentMedications: '',
        allergies: '',
        photo: null
      });
    } catch (err) {
      console.error('Error adding patient:', err);
      toast.error('Error adding patient. Please try again.');
    }
  };

  // Add this section to your add patient form JSX
  const photoUploadSection = (
    <div className="mb-4">
      <label className="block text-gray-700 mb-2">Patient Photo</label>
      <div className="space-y-2">
        {patientData.photo ? (
          <div className="relative w-32 h-32">
            <img 
              src={patientData.photo} 
              alt="Patient" 
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              onClick={() => setPatientData(prev => ({ ...prev, photo: null }))}
              className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Take Photo
            </button>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}
      </div>

      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="rounded-lg mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Helper function to safely get bed counts
  const getBedCounts = (type) => {
    if (!beds || !beds[type]) {
      return { available: 0, total: 0 };
    }
    return beds[type];
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'doctors'), {
        ...newDoctor,
        createdAt: serverTimestamp()
      });
      setShowAddDoctor(false);
      setNewDoctor({
        name: '',
        department: '',
        specialization: '',
        experience: '',
        availability: 'Available',
        contact: '',
        email: ''
      });
      toast.success('Doctor added successfully');
    } catch (error) {
      console.error('Error adding doctor:', error);
      toast.error('Failed to add doctor');
    }
  };

  const renderNotifications = () => (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-800"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <div key={notification.id} className="p-4 border-b hover:bg-gray-50">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {notification.timestamp?.toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No new notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">Welcome, {hospitalName}!</h1>
              <p className="ml-4 text-blue-600">Hospital ID: {hospitalId}</p>
            </div>
            <div className="flex items-center space-x-4">
              {renderNotifications()}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Total Patients</h3>
            <p className="text-3xl font-bold text-blue-600">{totalPatients}</p>
            <p className="text-sm text-gray-500">Active patients under care</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">General Beds</h3>
            <p className="text-3xl font-bold text-green-600">
              {getBedCounts('General').available}/{getBedCounts('General').total}
            </p>
            <p className="text-sm text-gray-500">Available/Total</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Private Beds</h3>
            <p className="text-3xl font-bold text-green-600">
              {getBedCounts('Private').available}/{getBedCounts('Private').total}
            </p>
            <p className="text-sm text-gray-500">Available/Total</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">ICU Beds</h3>
            <p className="text-3xl font-bold text-green-600">
              {getBedCounts('ICU').available}/{getBedCounts('ICU').total}
            </p>
            <p className="text-sm text-gray-500">Available/Total</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Emergency Beds</h3>
            <p className="text-3xl font-bold text-green-600">
              {getBedCounts('Emergency').available}/{getBedCounts('Emergency').total}
            </p>
            <p className="text-sm text-gray-500">Available/Total</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/add-patient')}
            className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Patient</span>
          </button>
          
          <button
            onClick={() => navigate('/patient-info')}
            className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>View Patient Records</span>
          </button>
          
          <button
            onClick={() => navigate('/hospital-connection')}
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Hospital Network</span>
          </button>
        </div>

        {/* Doctors by Department */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Doctors by Department</h2>
            <button
              onClick={() => setShowAddDoctor(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Add Doctor
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map(dept => {
              const deptDoctors = doctors.filter(doc => doc.department === dept);
              return (
                <div key={dept} className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-3">{dept}</h3>
                  <div className="space-y-2">
                    {deptDoctors.length > 0 ? (
                      deptDoctors.map(doctor => (
                        <div key={doctor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{doctor.name}</p>
                            <p className="text-sm text-gray-500">{doctor.specialization}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            doctor.availability === 'Available' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doctor.availability}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No doctors assigned</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Doctor Modal */}
        {showAddDoctor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add New Doctor</h2>
              <form onSubmit={handleAddDoctor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    value={newDoctor.department}
                    onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialization</label>
                  <input
                    type="text"
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Experience (years)</label>
                  <input
                    type="number"
                    value={newDoctor.experience}
                    onChange={(e) => setNewDoctor({ ...newDoctor, experience: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact</label>
                  <input
                    type="tel"
                    value={newDoctor.contact}
                    onChange={(e) => setNewDoctor({ ...newDoctor, contact: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Availability</label>
                  <select
                    value={newDoctor.availability}
                    onChange={(e) => setNewDoctor({ ...newDoctor, availability: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddDoctor(false)}
                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Add Doctor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default Dashboard;